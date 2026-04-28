// Returns public config that the browser needs — only non-secret values.
// Set PUBLIC_SERVER_URL in your Vercel environment variables.
module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Cache-Control", "public, max-age=3600"); // cache 1hr, it never changes

  const serverUrl = process.env.PUBLIC_SERVER_URL || "";

  if (!serverUrl) {
    // Vercel gives us the deployment URL at runtime — use it as fallback
    const host = req.headers["x-forwarded-host"] || req.headers.host || "";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const derived = host ? `${proto}://${host}/api` : "";
    return res.json({ ok: true, serverUrl: derived, derived: true });
  }

  res.json({ ok: true, serverUrl, derived: false });
};