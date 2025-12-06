
export default async function handler(req, res) {
  // --- CẤU HÌNH SERVER SIDE (VERCEL) ---
  // Lấy Key từ biến môi trường trên Vercel
  const SERVER_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  // -------------------------------------

  // CORS Setup
  const allowedOrigins = [
    'https://an-tam-viec-lam-website.vercel.app', 
    'http://localhost:3000', 
    'http://localhost', 
    'capacitor://localhost'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, history, systemInstruction } = body;

    // Kiểm tra Key trên Server
    if (!SERVER_API_KEY) {
      console.error("[API/Chat] ERROR: Missing GEMINI_API_KEY in Vercel Environment Variables.");
      return res.status(500).json({ 
        error: "Server configuration error. API Key is missing." 
      });
    }

    const MODEL_NAME = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${SERVER_API_KEY}`;

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

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[API/Chat] Google API Error:", JSON.stringify(data));
      // Nếu key bị lỗi, trả về lỗi rõ ràng
      return res.status(response.status).json({
        error: data.error?.message || "Google API Error"
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text || "Không có nội dung trả về." });

  } catch (e) {
    console.error("[API/Chat] Internal Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
