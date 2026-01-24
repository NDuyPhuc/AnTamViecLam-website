
export default async function handler(req, res) {
  // --- CẤU HÌNH SERVER SIDE (VERCEL) ---
  const SERVER_API_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.VITE_API_KEY || 
    process.env.VITE_GOOGLE_API_KEY;
  // -------------------------------------

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

    // 2. Kiểm tra API Key
    if (!SERVER_API_KEY) {
      console.error("[API/Chat] LỖI: Chưa cấu hình API Key trên Vercel (Settings -> Environment Variables).");
      return res.status(500).json({ 
        error: "Server Error: Missing API Key. Please configure VITE_GEMINI_API_KEY in Vercel Settings." 
      });
    }

    // 3. Chọn Model: Sử dụng bản Experimental 2.0 hoặc 1.5 Pro (ổn định)
    // Lưu ý: gemini-2.0-flash thường có tên mã là 'gemini-2.0-flash-exp'
    const MODEL_NAME = "gemini-2.0-flash-exp"; 
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
      console.error("[API/Chat] Google API Error:", JSON.stringify(data, null, 2));
      
      // Fallback: Nếu model 2.0 lỗi (404/400), thử lại với gemini-1.5-pro
      if (response.status === 404 || response.status === 400) {
          console.log("[API/Chat] Retrying with gemini-1.5-pro...");
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${SERVER_API_KEY}`;
          const fallbackResponse = await fetch(fallbackUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
          });
          const fallbackData = await fallbackResponse.json();
          if (fallbackResponse.ok) {
               const text = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
               return res.status(200).json({ text: text || "Không có nội dung." });
          }
      }

      return res.status(response.status).json({
        error: data.error?.message || "Google API Error",
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
