
export default async function handler(req, res) {
  // --- CẤU HÌNH SERVER SIDE (VERCEL) ---
  // Thử tất cả các tên biến môi trường có thể có để đảm bảo tìm thấy Key
  const SERVER_API_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    process.env.VITE_API_KEY || 
    process.env.VITE_GOOGLE_API_KEY;
  // -------------------------------------

  // CORS Setup (Cho phép Mobile App gọi)
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

    console.log(`[API/Analyze] Request received.`);

    if (!SERVER_API_KEY) {
      console.error("[API/Analyze] ERROR: Missing API Key on Server. Checked all VITE_ env vars.");
      return res.status(500).json({ 
        error: "Server configuration error. API Key is missing. Please redeploy Vercel project." 
      });
    }

    const MODEL_NAME = "gemini-2.5-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${SERVER_API_KEY}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        response_mime_type: "application/json", // Bắt buộc trả về JSON
      }
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[API/Analyze] Google API Error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || "Google API Error"
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Parse JSON string từ model trả về
    try {
        // Làm sạch chuỗi JSON phòng trường hợp model trả về markdown code block
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonResult = JSON.parse(cleanText);
        res.status(200).json(jsonResult);
    } catch (parseError) {
        console.error("Model did not return valid JSON:", text);
        res.status(500).json({ error: "AI Response is not valid JSON", raw: text });
    }

  } catch (e) {
    console.error("[API/Analyze] Internal Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
