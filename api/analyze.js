
export default async function handler(req, res) {
  // --- CẤU HÌNH GOOGLE API ---
  // Lấy Key từ biến môi trường Vercel (đã tạo ở Bước 1)
  const API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY;
  // Sử dụng Gemini 1.5 Flash cho tốc độ nhanh và rẻ, hoặc 2.0 Flash Experimental
  const MODEL_NAME = "gemini-1.5-flash"; 

  // 1. CORS Setup
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

  if (!API_KEY) {
    return res.status(500).json({ error: "Server Error: Missing GOOGLE_API_KEY in Environment Variables." });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt } = body;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

    console.log(`[API/Analyze] Calling Google Gemini (${MODEL_NAME})...`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
            role: "user", 
            parts: [{ text: prompt }] 
        }],
        generationConfig: {
            temperature: 0.1, // Nhiệt độ thấp để ra JSON chuẩn
            responseMimeType: "application/json" // Ép kiểu trả về JSON (chỉ hỗ trợ trên Gemini 1.5+)
        }
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("[API/Analyze] Google Error:", response.status, errorText);
        return res.status(response.status).json({ 
            error: "Google API Error", 
            details: errorText 
        });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        return res.status(500).json({ error: "No content returned from Google Gemini" });
    }
    
    // Parse JSON kết quả
    try {
        // Mặc dù đã set responseMimeType, đôi khi vẫn cần clean markdown
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonResult = JSON.parse(cleanText);
        res.status(200).json(jsonResult);
    } catch (parseError) {
        console.error("Invalid JSON from Gemini:", text);
        res.status(500).json({ error: "AI Response is not valid JSON", raw: text });
    }

  } catch (e) {
    console.error("[API/Analyze] Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
