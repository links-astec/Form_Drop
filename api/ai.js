// AI proxy — uses Groq API (fast, free tier available)
// Set GROQ_API_KEY in your environment variables
// Get your key at: https://console.groq.com

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "GROQ_API_KEY is not set. Add it in Vercel → Settings → Environment Variables. Get your key at console.groq.com"
    });
  }

  const { systemPrompt, userMessage } = req.body;
  if (!userMessage) {
    return res.status(400).json({ ok: false, error: "userMessage is required" });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user",   content: userMessage  },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data.error?.message || "Groq API error"
      });
    }

    // Return in a shape the builder can consume
    const text = data.choices?.[0]?.message?.content || "{}";
    res.json({ ok: true, content: [{ type: "text", text }] });

  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};