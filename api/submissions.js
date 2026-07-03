// PATCH  /api/submissions              — bulk-update one question's answer across specific submissions
// DELETE /api/submissions?formId=&ids= — delete specific submissions
//
// Used by analytics.html's "AI Edit" feature to fix data-entry mistakes in
// already-collected responses. The AI never touches this endpoint directly —
// it only proposes a plan; the client resolves exactly which submission ids
// are affected and shows the user a confirmation before this ever runs.
const { query } = require("./_db");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ ok: false, error: "DATABASE_URL is not set in Vercel environment variables." });
  }

  // PATCH — set one question's answer for a specific set of submissions
  if (req.method === "PATCH") {
    const { formId, ids, questionId, value } = req.body;
    if (!formId || !Array.isArray(ids) || !ids.length || !questionId) {
      return res.status(400).json({ ok: false, error: "formId, ids, and questionId are required" });
    }
    const numericIds = ids.map(Number).filter(n => Number.isInteger(n));
    if (!numericIds.length) {
      return res.status(400).json({ ok: false, error: "ids must be submission id numbers" });
    }
    try {
      const result = await query(
        `UPDATE submissions
         SET answers = jsonb_set(answers, ARRAY[$1::text], $2::jsonb, true)
         WHERE id = ANY($3::bigint[]) AND form_id = $4`,
        [questionId, JSON.stringify(value === undefined ? null : value), numericIds, formId]
      );
      return res.json({ ok: true, updated: result.rowCount });
    } catch (err) {
      console.error("Bulk update error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // DELETE — remove specific submissions (scoped to the given form for safety)
  if (req.method === "DELETE") {
    const formId = req.query.formId || (req.url.split("formId=")[1] || "").split("&")[0];
    const idsRaw = req.query.ids || (req.url.split("ids=")[1] || "").split("&")[0];
    if (!formId || !idsRaw) {
      return res.status(400).json({ ok: false, error: "formId and ids query params are required" });
    }
    const numericIds = decodeURIComponent(idsRaw).split(",").map(Number).filter(n => Number.isInteger(n));
    if (!numericIds.length) {
      return res.status(400).json({ ok: false, error: "ids must be a comma-separated list of submission id numbers" });
    }
    try {
      const result = await query(
        `DELETE FROM submissions WHERE id = ANY($1::bigint[]) AND form_id = $2`,
        [numericIds, decodeURIComponent(formId)]
      );
      return res.json({ ok: true, deleted: result.rowCount });
    } catch (err) {
      console.error("Bulk delete error:", err);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  res.status(405).json({ ok: false, error: "Method not allowed" });
};
