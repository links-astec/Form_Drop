// PATCH  /api/submissions              — bulk-update one question's answer across specific submissions,
//                                          OR rename respondents (each id can get its own new name)
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

  // PATCH — either bulk-set one question's answer for a set of submissions
  // ({formId, ids, questionId, value}), or rename respondents where each
  // submission can get its own distinct name ({formId, renames: [{id, respondentName}]})
  if (req.method === "PATCH") {
    const { formId, ids, questionId, value, renames } = req.body;

    if (Array.isArray(renames) && renames.length) {
      if (!formId) return res.status(400).json({ ok: false, error: "formId is required" });
      const valid = renames.filter(r => r && Number.isInteger(Number(r.id)) && typeof r.respondentName === "string");
      if (!valid.length) return res.status(400).json({ ok: false, error: "renames must be [{id, respondentName}]" });
      try {
        let updated = 0;
        for (const r of valid) {
          const result = await query(
            `UPDATE submissions SET respondent_name = $1 WHERE id = $2 AND form_id = $3`,
            [r.respondentName, Number(r.id), formId]
          );
          updated += result.rowCount;
        }
        return res.json({ ok: true, updated });
      } catch (err) {
        console.error("Bulk rename error:", err);
        return res.status(500).json({ ok: false, error: err.message });
      }
    }

    if (!formId || !Array.isArray(ids) || !ids.length || !questionId) {
      return res.status(400).json({ ok: false, error: "formId, ids, and questionId (or formId + renames) are required" });
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
