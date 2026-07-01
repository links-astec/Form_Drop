// GET    /api/respondents        — list all respondents
// POST   /api/respondents        — create/update a respondent
// DELETE /api/respondents?id=    — delete a respondent
const { query } = require("./_db");

let _tablesReady = false;

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS respondents (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT,
      persona    TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "DATABASE_URL is not set in Vercel environment variables." });
  }

  try {
    if (!_tablesReady) { await ensureTables(); _tablesReady = true; }
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Database connection failed: " + err.message });
  }

  // GET — list all respondents
  if (req.method === "GET") {
    try {
      const { rows } = await query(
        `SELECT id, name, email, persona, created_at FROM respondents ORDER BY created_at ASC`
      );
      return res.json({ ok: true, respondents: rows });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // POST — create or update a respondent
  if (req.method === "POST") {
    const { id, name, email, persona } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: "name is required" });
    }
    const respId = id || ("r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    try {
      await query(`
        INSERT INTO respondents (id, name, email, persona)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE
          SET name = EXCLUDED.name, email = EXCLUDED.email, persona = EXCLUDED.persona
      `, [respId, String(name).trim(), email || null, persona || null]);
      return res.json({ ok: true, id: respId });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE — remove a respondent
  if (req.method === "DELETE") {
    const respId = req.query.id || (req.url.split("?id=")[1] || "").split("&")[0];
    if (!respId) return res.status(400).json({ ok: false, error: "id query param required" });
    try {
      const result = await query("DELETE FROM respondents WHERE id = $1", [decodeURIComponent(respId)]);
      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: "Respondent not found" });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
