
export default async function handler(req, res) {
  // --- CẤU HÌNH SERVER SIDE (VERCEL) ---
  // Lấy Key từ biến môi trường trên Vercel
  // Ưu tiên VITE_GEMINI_API_KEY nếu người dùng đặt theo thói quen Frontend, hoặc GEMINI_API_KEY chuẩn
  const SERVER_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  // -------------------------------------

  // Log request để debug
  console.log("[API/Chat] Received request method:", req.method);

  // CORS Setup - Cấu hình linh hoạt để chạy được cả trên Web và Mobile App (Capacitor)
  const allowedOrigins = [
    'https://an-tam-viec-lam-website.vercel.app', // Domain chính
    'http://localhost:3000', // Local dev
    'http://localhost', // Capacitor Android
    'capacitor://localhost' // Capacitor iOS/Android
  ];
  
  const origin = req.headers.origin;
  
  // Nếu origin nằm trong whitelist hoặc không có origin (server-to-server/mobile), cho phép
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Fallback cho tiện
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
    // Parse body an toàn
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, history, systemInstruction } = body;

    if (!SERVER_API_KEY) {
      console.error("[API/Chat] Missing API Key in Environment Variables");
      return res.status(500).json({ 
        error: "Server API Key not configured. Please set GEMINI_API_KEY in Vercel Settings." 
      });
    }

    const MODEL_NAME = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${SERVER_API_KEY}`;

    console.log("[API/Chat] Forwarding request to Google API...");

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
      return res.status(response.status).json({
        error: data.error?.message || "Google API returned an error."
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Log thành công
    console.log("[API/Chat] Success. Response length:", text ? text.length : 0);
    res.status(200).json({ text: text || "Không có nội dung trả về." });

  } catch (e) {
    console.error("[API/Chat] Internal Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
