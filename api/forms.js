const { query } = require("./_db");

let _tablesReady = false;

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS forms (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      questions   JSONB NOT NULL DEFAULT '[]',
      numbered    BOOLEAN NOT NULL DEFAULT false,
      cover       JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id             BIGSERIAL PRIMARY KEY,
      form_id        TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      answers        JSONB NOT NULL DEFAULT '{}',
      submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      respondent_name TEXT
    );
    CREATE INDEX IF NOT EXISTS submissions_form_id_idx ON submissions(form_id);
    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS respondent_name TEXT;
    ALTER TABLE forms ADD COLUMN IF NOT EXISTS numbered BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE forms ADD COLUMN IF NOT EXISTS cover JSONB NOT NULL DEFAULT '{}';
  `);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  // Guard: if DATABASE_URL isn't set, return a clear JSON error immediately
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      ok: false,
      error: "DATABASE_URL is not set. Add it in Vercel → Project → Settings → Environment Variables, then redeploy."
    });
  }

  try {
    if (!_tablesReady) { await ensureTables(); _tablesReady = true; }
  } catch (dbErr) {
    return res.status(500).json({
      ok: false,
      error: "Database connection failed: " + dbErr.message
    });
  }

  // POST /api/forms — upsert a form definition
  if (req.method === "POST") {
    const { id, title, desc, questions, numbered, cover, confirmClear } = req.body;
    if (!id || !title || !Array.isArray(questions)) {
      return res.status(400).json({ ok: false, error: "id, title, and questions are required" });
    }
    try {
      // Guard against silently wiping a form's questions. This happens if a client
      // ends up with an empty in-memory question list (e.g. a stale/failed load)
      // and then saves — without this check that blindly overwrites real, saved
      // work with nothing. Only blocks the "had questions, now saving zero" case;
      // normal edits (removing a couple of questions) are unaffected.
      if (questions.length === 0 && !confirmClear) {
        const { rows: existing } = await query(
          `SELECT jsonb_array_length(questions) AS qcount FROM forms WHERE id = $1`,
          [id]
        );
        if (existing.length && existing[0].qcount > 0) {
          return res.status(409).json({
            ok: false,
            error: `This form already has ${existing[0].qcount} saved question(s), but you're about to save it with none. Reload the form before saving, or confirm you want to clear it.`,
            existingQuestionCount: existing[0].qcount,
          });
        }
      }
      await query(`
        INSERT INTO forms (id, title, description, questions, numbered, cover, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              description = EXCLUDED.description,
              questions = EXCLUDED.questions,
              numbered = EXCLUDED.numbered,
              cover = EXCLUDED.cover,
              updated_at = NOW()
      `, [id, title, desc || "", JSON.stringify(questions), !!numbered, JSON.stringify(cover || {})]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Save form error:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
    return;
  }

  // GET /api/forms/[id] — fetch a form definition
  if (req.method === "GET") {
    // The vercel.json rewrite "/api/forms/:id -> /api/forms" does NOT strip the
    // matched :id out of the URL — it appends it as a query param instead, so
    // req.url actually looks like "/api/forms/<id>?id=<id>". Read it from
    // req.query first (this is what the rewrite gives us); fall back to parsing
    // the path for direct "/api/forms/<id>" calls that bypass the rewrite.
    const pathParts = req.url.split("?")[0].split("/").filter(Boolean);
    const pathId = pathParts[pathParts.length - 1];
    const formId = req.query.id || (pathId === "forms" ? "" : pathId);

    if (!formId) {
      return res.status(400).json({ ok: false, error: "Form ID required" });
    }

    try {
      const { rows } = await query(
        `SELECT id, title, description, questions, numbered, cover FROM forms WHERE id = $1`,
        [formId]
      );
      if (!rows.length) {
        return res.status(404).json({ ok: false, error: "Form not found" });
      }
      const form = rows[0];
      res.json({
        ok: true,
        form: {
          id: form.id,
          title: form.title,
          desc: form.description,
          questions: form.questions,
          numbered: form.numbered,
          cover: form.cover,
        },
      });
    } catch (err) {
      console.error("Get form error:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
    return;
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
