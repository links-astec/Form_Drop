const { query } = require("./_db");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const urlParts = req.url.split("?")[0].split("/").filter(Boolean);
  const formId = urlParts[urlParts.length - 1];

  if (!formId || formId === "analytics") {
    return res.status(400).json({ ok: false, error: "Form ID required" });
  }

  try {
    // Form definition
    const { rows: formRows } = await query(
      `SELECT id, title, description, questions FROM forms WHERE id = $1`,
      [formId]
    );
    if (!formRows.length) {
      return res.status(404).json({ ok: false, error: "Form not found" });
    }

    // All submissions
    const { rows: subs } = await query(
      `SELECT id, answers, submitted_at, respondent_name FROM submissions WHERE form_id = $1 ORDER BY submitted_at ASC`,
      [formId]
    );

    const form = formRows[0];
    res.json({
      ok: true,
      form: {
        id: form.id,
        title: form.title,
        desc: form.description,
        questions: form.questions,
      },
      submissions: subs.map(s => ({
        id: s.id,
        answers: s.answers,
        submittedAt: s.submitted_at,
        respondentName: s.respondent_name || null,
      })),
      total: subs.length,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};