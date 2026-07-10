// GET /api/analysis-groups?formId=  — fetch derived analysis groups (e.g. "Stratum") for a form
// PUT /api/analysis-groups          — { formId, groups } replace the saved groups for a form
//
// Kept separate from api/forms.js's full-form upsert (which guards against silently wiping
// questions) so saving a group definition can never interact with that guard or touch anything
// else on the form.
const { query, ensureTables } = require("./_db");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "DATABASE_URL is not set in Vercel environment variables." });
  }

  try {
    await ensureTables();
  } catch (dbErr) {
    return res.status(500).json({ ok: false, error: "Database connection failed: " + dbErr.message });
  }

  if (req.method === "GET") {
    const formId = req.query.formId;
    if (!formId) return res.status(400).json({ ok: false, error: "formId is required" });
    try {
      const { rows } = await query(`SELECT analysis_groups FROM forms WHERE id = $1`, [formId]);
      if (!rows.length) return res.status(404).json({ ok: false, error: "Form not found" });
      return res.json({ ok: true, groups: rows[0].analysis_groups || [] });
    } catch (err) {
      console.error("Get analysis groups error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  if (req.method === "PUT") {
    const { formId, groups } = req.body;
    if (!formId || !Array.isArray(groups)) {
      return res.status(400).json({ ok: false, error: "formId and groups (array) are required" });
    }
    try {
      const result = await query(
        `UPDATE forms SET analysis_groups = $2 WHERE id = $1`,
        [formId, JSON.stringify(groups)]
      );
      if (!result.rowCount) return res.status(404).json({ ok: false, error: "Form not found" });
      return res.json({ ok: true });
    } catch (err) {
      console.error("Save analysis groups error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
