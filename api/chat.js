
export default async function handler(req, res) {
  // --- CẤU HÌNH SERVER SIDE (VERCEL) ---
  // Ưu tiên biến môi trường, nếu không có sẽ dùng Key dự phòng bạn vừa cung cấp
  const SERVER_API_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    "AIzaSyCB_MqUl4A1k8SNTkrf5vwmmBtvCpSi5IM"; 
  // -------------------------------------

  // Log kiểm tra key (Chỉ hiện 8 ký tự đầu)
  const keyPrefix = SERVER_API_KEY ? SERVER_API_KEY.slice(0, 8) : "NONE";
  console.log(`[API/Chat] Request received. Using Key: ${keyPrefix}...`);

  // 1. CORS: Cho phép tất cả (*) để tránh lỗi chặn khi debug
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Xử lý Preflight Request
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

    if (!SERVER_API_KEY) {
      return res.status(500).json({ error: "Missing API Key configuration." });
    }

    // 2. Chọn Model: Sử dụng gemini-2.0-flash (bản ổn định mới nhất)
    const MODEL_NAME = "gemini-2.0-flash"; 
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
        maxOutputTokens: 1000,
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[API/Chat] Google API Error:", JSON.stringify(data, null, 2));
      
      let errorMessage = data.error?.message || "Google API Error";
      // BẢO MẬT: Che giấu API Key
      errorMessage = errorMessage.replace(/key:[^ ]+/, "key:***HIDDEN***");

      return res.status(response.status).json({
        error: errorMessage,
        details: data.error
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text: text || "Không có nội dung trả về." });

  } catch (e) {
    console.error("[API/Chat] Internal Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
