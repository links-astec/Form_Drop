module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.json({ ok: true, service: "formdrop-server" });
};