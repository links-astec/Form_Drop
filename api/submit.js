const nodemailer = require("nodemailer");
const XLSX = require("xlsx");
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

function buildXLSX(formTitle, questions, submissions) {
  const header = [
    "Submission #",
    "Submitted At",
    ...questions.map((q, i) => q.label || `Question ${i + 1}`)
  ];
  const rows = submissions.map((sub, idx) => [
    idx + 1,
    new Date(sub.submitted_at).toLocaleString(),
    ...questions.map((q) => {
      const v = sub.answers[q.id];
      return Array.isArray(v) ? v.join(", ") : v || "";
    }),
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 14 }, { wch: 22 }, ...questions.map(() => ({ wch: 30 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Responses");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  return nodemailer.createTransport({
    host, port, secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      ok: false,
      error: "DATABASE_URL is not set in Vercel environment variables."
    });
  }

  const { formId, formTitle, questions, answers } = req.body;
  if (!formId || !formTitle || !Array.isArray(questions) || !answers) {
    return res.status(400).json({ ok: false, error: "formId, formTitle, questions, and answers are all required" });
  }

  const toEmail = process.env.TO_EMAIL;
  if (!toEmail) return res.status(500).json({ ok: false, error: "TO_EMAIL not configured" });

  const pool = getPool();
  try {
    await ensureTables(pool);

    await pool.query(
      `INSERT INTO submissions (form_id, answers) VALUES ($1, $2)`,
      [formId, JSON.stringify(answers)]
    );

    const { rows: allSubs } = await pool.query(
      `SELECT answers, submitted_at FROM submissions WHERE form_id = $1 ORDER BY submitted_at ASC`,
      [formId]
    );

    const totalCount = allSubs.length;
    const submittedAt = new Date().toLocaleString();
    const safeTitle = formTitle.replace(/[^a-z0-9]/gi, "_");
    const xlsxBuffer = buildXLSX(formTitle, questions, allSubs);

    const textSummary = questions.map((q, i) => {
      const v = answers[q.id];
      return `${q.label || `Question ${i + 1}`}:\n  ${Array.isArray(v) ? v.join(", ") : v || "—"}`;
    }).join("\n\n");

    const htmlRows = questions.map((q, i) => {
      const label = q.label || `Question ${i + 1}`;
      const v = answers[q.id];
      const value = Array.isArray(v) ? v.join(", ") : v || "<em style='color:#a8a49e'>—</em>";
      return `<tr>
        <td style="padding:10px 12px;background:#f7f5f0;border:1px solid #e2ddd4;font-weight:500;width:38%;vertical-align:top">${label}</td>
        <td style="padding:10px 12px;border:1px solid #e2ddd4;border-left:none;vertical-align:top">${value}</td>
      </tr>`;
    }).join("");

    // Email is best-effort — a failed send should not fail the submission
    let emailError = null;
    try { await createTransporter().sendMail({
      from: `"FormDrop" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: `[FormDrop] New response — ${formTitle} (#${totalCount})`,
      text: [`New response for: ${formTitle}`, `Submitted at: ${submittedAt}`, `Total responses: ${totalCount}`, ``, textSummary, ``, `Attached: all ${totalCount} responses as Excel.`].join("\n"),
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1916">
        <div style="border-top:4px solid #2a5c45;border-radius:8px;background:#fff;border:1px solid #e2ddd4;overflow:hidden">
          <div style="padding:20px 24px;background:#f7f5f0;border-bottom:1px solid #e2ddd4">
            <span style="font-size:13px;font-weight:600;color:#2a5c45;letter-spacing:0.5px;text-transform:uppercase">FormDrop</span>
          </div>
          <div style="padding:24px">
            <h2 style="margin:0 0 4px;font-size:20px;font-weight:600">New response received</h2>
            <p style="margin:0 0 4px;color:#6b6760;font-size:13px">${formTitle} · ${submittedAt}</p>
            <p style="margin:0 0 20px;color:#a8a49e;font-size:12px">Response #${totalCount} total</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">${htmlRows}</table>
            <p style="margin:20px 0 0;font-size:12px;color:#a8a49e">Attached: all ${totalCount} response${totalCount===1?'':'s'} as Excel.</p>
          </div>
        </div>
      </div>`,
      attachments: [{
        filename: `${safeTitle}_all_responses.xlsx`,
        content: xlsxBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }],
    }); } catch(mailErr) { emailError = mailErr.message; console.error("Mail error:", mailErr); }

    res.json({ ok: true, total: totalCount, emailSent: !emailError, emailError: emailError || undefined });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
};