// GET  /api/forms-list        — list all forms
// DELETE /api/forms-list?id=  — delete a form + its submissions
const { Pool } = require("pg");

let _pool = null;
let _tablesReady = false;

function getPool() {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("localhost")
        ? false : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return _pool;
}

async function ensureTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS forms (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      questions JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id BIGSERIAL PRIMARY KEY,
      form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
      answers JSONB NOT NULL DEFAULT '{}',
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS submissions_form_id_idx ON submissions(form_id);
  `);
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "DATABASE_URL is not set in Vercel environment variables." });
  }

  const pool = getPool();
  try {
    if (!_tablesReady) { await ensureTables(pool); _tablesReady = true; }
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Database connection failed: " + err.message });
  }

  // GET — list all forms with response counts
  if (req.method === "GET") {
    try {
      const { rows } = await pool.query(`
        SELECT
          f.id, f.title, f.description,
          jsonb_array_length(f.questions) AS question_count,
          f.created_at, f.updated_at,
          COUNT(s.id)::int AS response_count
        FROM forms f
        LEFT JOIN submissions s ON s.form_id = f.id
        GROUP BY f.id
        ORDER BY f.updated_at DESC
      `);
      return res.json({ ok: true, forms: rows });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE — remove a form and all its submissions (cascade handles submissions)
  if (req.method === "DELETE") {
    const formId = req.query.id || (req.url.split("?id=")[1] || "").split("&")[0];
    if (!formId) return res.status(400).json({ ok: false, error: "id query param required" });
    try {
      const result = await pool.query("DELETE FROM forms WHERE id = $1", [formId]);
      if (result.rowCount === 0) return res.status(404).json({ ok: false, error: "Form not found" });
      return res.json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};