const { Pool } = require("pg");

let _pool = null;
let _tablesReady = false;

function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return _pool;
}

async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forms (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      description TEXT,
      questions   JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id           BIGSERIAL PRIMARY KEY,
      form_id      TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      answers      JSONB NOT NULL DEFAULT '{}',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS submissions_form_id_idx ON submissions(form_id);
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

  const pool = getPool();
  if (!_tablesReady) { await ensureTables(pool); _tablesReady = true; }

  // POST /api/forms — upsert a form definition
  if (req.method === "POST") {
    const { id, title, desc, questions } = req.body;
    if (!id || !title || !Array.isArray(questions)) {
      return res.status(400).json({ ok: false, error: "id, title, and questions are required" });
    }
    try {
      await pool.query(`
        INSERT INTO forms (id, title, description, questions, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              description = EXCLUDED.description,
              questions = EXCLUDED.questions,
              updated_at = NOW()
      `, [id, title, desc || "", JSON.stringify(questions)]);
      res.json({ ok: true });
    } catch (err) {
      console.error("Save form error:", err);
      res.status(500).json({ ok: false, error: err.message });
    }
    return;
  }

  // GET /api/forms/[id] — fetch a form definition
  if (req.method === "GET") {
    // Vercel passes path params via query when using [id].js naming,
    // but with forms.js we parse the URL manually
    const urlParts = req.url.split("/").filter(Boolean);
    const formId = urlParts[urlParts.length - 1];

    if (!formId || formId === "forms") {
      return res.status(400).json({ ok: false, error: "Form ID required" });
    }

    try {
      const { rows } = await pool.query(
        `SELECT id, title, description, questions FROM forms WHERE id = $1`,
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