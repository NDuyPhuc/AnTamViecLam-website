
export default async function handler(req, res) {
  // --- CẤU HÌNH SERVER SIDE (VERCEL) ---
  const SERVER_API_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.VITE_API_KEY || 
    process.env.VITE_GOOGLE_API_KEY;
  // -------------------------------------

  // Log kiểm tra Key
  const keyPrefix = SERVER_API_KEY ? SERVER_API_KEY.slice(0, 8) : "NONE";
  console.log(`[API/Analyze] Request received. Using Key starting with: ${keyPrefix}...`);

  // 1. CORS: Cho phép tất cả
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
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
    const { prompt } = body;

    if (!SERVER_API_KEY) {
      console.error("[API/Analyze] ERROR: Missing API Key.");
      return res.status(500).json({ 
        error: "Server Error: Missing API Key. Check Vercel Settings." 
      });
    }

    // 2. Chọn Model: Sử dụng bản ổn định 1.5 Flash
    const MODEL_NAME = "gemini-1.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${SERVER_API_KEY}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        response_mime_type: "application/json",
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[API/Analyze] Google API Error:", JSON.stringify(data, null, 2));
      
      let errorMessage = data.error?.message || "Google API Error";
      // BẢO MẬT: Che giấu API Key nếu nó xuất hiện trong thông báo lỗi
      errorMessage = errorMessage.replace(/key:[^ ]+/, "key:***HIDDEN***");

      // Fallback nếu model chính lỗi 404
      if (response.status === 404) {
          console.log("[API/Analyze] Retrying with gemini-1.5-pro...");
          const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${SERVER_API_KEY}`;
          const fallbackResponse = await fetch(fallbackUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
          });
          const fallbackData = await fallbackResponse.json();
          if (fallbackResponse.ok) {
               const text = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text;
               const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
               return res.status(200).json(JSON.parse(cleanText));
          }
      }

      return res.status(response.status).json({
        error: errorMessage,
        details: data.error
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    try {
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonResult = JSON.parse(cleanText);
        res.status(200).json(jsonResult);
    } catch (parseError) {
        console.error("Invalid JSON from model:", text);
        res.status(500).json({ error: "AI Response is not valid JSON", raw: text });
    }

  } catch (e) {
    console.error("[API/Analyze] Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
