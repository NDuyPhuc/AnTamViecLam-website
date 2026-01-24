
export default async function handler(req, res) {
  const SERVER_API_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    "AIzaSyCB_MqUl4A1k8SNTkrf5vwmmBtvCpSi5IM";

  // Danh sách model ưu tiên. Nếu cái đầu lỗi 429, sẽ thử cái sau.
  // gemini-2.0-flash: Thông minh hơn nhưng quota ít.
  // gemini-1.5-flash: Ổn định, quota miễn phí cao hơn (15 RPM).
  const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { return res.status(405).json({ error: "Method not allowed" }); }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt } = body;

    if (!SERVER_API_KEY) return res.status(500).json({ error: "Missing API Key." });

    // Hàm delay để đợi trước khi thử lại
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    let lastError = null;

    // VÒNG LẶP THỬ MODEL
    for (const model of MODELS) {
        try {
            console.log(`[API/Analyze] Trying model: ${model}...`);
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${SERVER_API_KEY}`;
            
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

            // Nếu thành công (200) -> Trả về ngay
            if (response.ok) {
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                return res.status(200).json(JSON.parse(cleanText));
            }

            // Nếu lỗi 429 (Quota) hoặc 503 (Overloaded) -> Thử model tiếp theo
            if (response.status === 429 || response.status === 503) {
                console.warn(`[API/Analyze] Model ${model} overloaded/quota exceeded. Switching...`);
                lastError = data.error?.message || "Quota Exceeded";
                await sleep(1000); // Đợi 1 giây trước khi thử model khác
                continue; 
            }

            // Các lỗi khác (400, 403...) -> Chết luôn, không thử lại
            throw new Error(data.error?.message || "Unknown API Error");

        } catch (err) {
            console.error(`[API/Analyze] Error with ${model}:`, err.message);
            lastError = err.message;
            // Nếu là lỗi parse JSON từ model, cũng thử model khác
            if (err.message.includes("JSON")) continue;
        }
    }

    // Nếu chạy hết vòng lặp mà vẫn không được
    return res.status(429).json({ 
        error: "Hệ thống đang bận (Google API Quota). Vui lòng thử lại sau 1 phút.",
        details: lastError 
    });

  } catch (e) {
    console.error("[API/Analyze] Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
