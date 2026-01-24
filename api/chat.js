
export default async function handler(req, res) {
  // Lấy Key từ biến môi trường Vercel
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
  const MODEL_NAME = "gemini-1.5-flash"; // Dùng Flash cho chat nhanh

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: "Server Error: Missing GOOGLE_API_KEY" });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, history, systemInstruction } = body;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    // Chuẩn bị payload đúng chuẩn Google Gemini
    // History format từ client: [{ role: 'user'|'model', parts: [{text: '...'}] }]
    const contents = history ? [...history] : [];
    contents.push({ role: "user", parts: [{ text: message }] });

    const payload = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    if (systemInstruction) {
        payload.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[API/Chat] Google Error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || "Google API Error",
        details: data.error
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text || "Không có phản hồi." });

  } catch (e) {
    console.error("[API/Chat] Internal Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
