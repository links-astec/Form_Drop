require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const nodemailer= require("nodemailer");
const XLSX      = require("xlsx");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow your fill.html origin. Set ALLOWED_ORIGIN=* to allow any origin,
// or set it to your exact domain e.g. https://mysite.com
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json({ limit: "2mb" }));

// ── Nodemailer transporter ────────────────────────────────────────────────────
// Uses Gmail + App Password by default.
// For other providers set SMTP_HOST / SMTP_PORT in .env.
function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,   // your Gmail address
      pass: process.env.SMTP_PASS,   // your App Password (no spaces)
    },
  });
}

// ── Build XLSX buffer from submission data ────────────────────────────────────
function buildXLSX(formTitle, questions, answers) {
  const header = ["Submitted", ...questions.map((q, i) => q.label || `Question ${i + 1}`)];
  const row = [
    new Date().toLocaleString(),
    ...questions.map((q) => {
      const v = answers[q.id];
      return Array.isArray(v) ? v.join(", ") : v || "";
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet([header, row]);
  ws["!cols"] = [{ wch: 22 }, ...questions.map(() => ({ wch: 30 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Response");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

// ── Build plain-text summary ──────────────────────────────────────────────────
function buildSummary(questions, answers) {
  return questions
    .map((q, i) => {
      const label = q.label || `Question ${i + 1}`;
      const v = answers[q.id];
      const value = Array.isArray(v) ? v.join(", ") : v || "—";
      return `${label}:\n  ${value}`;
    })
    .join("\n\n");
}

// ── POST /submit ──────────────────────────────────────────────────────────────
app.post("/submit", async (req, res) => {
  const { formTitle, questions, answers } = req.body;

  if (!formTitle || !Array.isArray(questions) || !answers) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  const toEmail = process.env.TO_EMAIL;
  if (!toEmail) {
    return res.status(500).json({ ok: false, error: "TO_EMAIL not configured on server" });
  }

  try {
    const xlsxBuffer = buildXLSX(formTitle, questions, answers);
    const summary    = buildSummary(questions, answers);
    const safeTitle  = formTitle.replace(/[^a-z0-9]/gi, "_");
    const filename   = `${safeTitle}_${Date.now()}.xlsx`;
    const submittedAt = new Date().toLocaleString();

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"FormDrop" <${process.env.SMTP_USER}>`,
      to:   toEmail,
      subject: `[FormDrop] New response — ${formTitle}`,
      text: [
        `New response received for: ${formTitle}`,
        `Submitted at: ${submittedAt}`,
        ``,
        `─────────────────────────────`,
        summary,
        `─────────────────────────────`,
        ``,
        `The full response is attached as an Excel file.`,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a1916">
          <div style="border-top:4px solid #2a5c45;border-radius:8px;background:#fff;border:1px solid #e2ddd4;overflow:hidden">
            <div style="padding:20px 24px;background:#f7f5f0;border-bottom:1px solid #e2ddd4">
              <span style="font-size:13px;font-weight:600;color:#2a5c45;letter-spacing:0.5px;text-transform:uppercase">FormDrop</span>
            </div>
            <div style="padding:24px">
              <h2 style="margin:0 0 4px;font-size:20px;font-weight:600">New response received</h2>
              <p style="margin:0 0 20px;color:#6b6760;font-size:13px">${formTitle} · ${submittedAt}</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                ${questions.map((q, i) => {
                  const label = q.label || `Question ${i + 1}`;
                  const v = answers[q.id];
                  const value = Array.isArray(v) ? v.join(", ") : v || "<em style='color:#a8a49e'>—</em>";
                  return `
                    <tr>
                      <td style="padding:10px 12px;background:#f7f5f0;border:1px solid #e2ddd4;font-weight:500;width:38%;vertical-align:top;border-radius:4px 0 0 4px">${label}</td>
                      <td style="padding:10px 12px;border:1px solid #e2ddd4;border-left:none;vertical-align:top">${value}</td>
                    </tr>`;
                }).join("")}
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#a8a49e">The full response is also attached as an Excel file.</p>
            </div>
          </div>
        </div>`,
      attachments: [
        {
          filename,
          content:     xlsxBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Mail error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, service: "formdrop-server" }));

app.listen(PORT, () => {
  console.log(`✓ FormDrop server running on port ${PORT}`);
  if (!process.env.SMTP_USER) console.warn("⚠  SMTP_USER not set — emails will fail");
  if (!process.env.SMTP_PASS) console.warn("⚠  SMTP_PASS not set — emails will fail");
  if (!process.env.TO_EMAIL)  console.warn("⚠  TO_EMAIL not set — emails will fail");
});