export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, history, systemInstruction } = req.body;

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing API key in server environment variables" });
    }

    const MODEL_NAME = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        ...(history || []),
        { role: "user", parts: [{ text: message }] }
      ],
      system_instruction: systemInstruction
        ? { parts: [{ text: systemInstruction }] }
        : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    // 🔥 FIX QUAN TRỌNG: Override headers để Google không detect là Android
    const googleHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Vercel-Server", // ÉP thành server
      "X-Android-Package": "",       // Xóa header Android nếu có
      "X-Android-Cert": "",          // Xóa header Android nếu có
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: googleHeaders,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Google API error."
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: "AI không trả về nội dung." });
    }

    res.status(200).json({ text });

  } catch (e) {
    console.error("Backend Handler Error:", e);
    res.status(500).json({ error: "Internal server error" });
  }
}