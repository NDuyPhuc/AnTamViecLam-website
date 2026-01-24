
export default async function handler(req, res) {
  const SERVER_API_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    "AIzaSyCB_MqUl4A1k8SNTkrf5vwmmBtvCpSi5IM";

  // Ưu tiên 2.0, nếu lỗi quota thì xuống 1.5
  const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") { return res.status(405).json({ error: "Method not allowed" }); }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { message, history, systemInstruction } = body;

    if (!SERVER_API_KEY) return res.status(500).json({ error: "Missing API Key configuration." });

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`[API/Chat] Trying model: ${model}...`);
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${SERVER_API_KEY}`;

            const payload = {
                contents: [
                    ...(history || []),
                    { role: "user", parts: [{ text: message }] }
                ],
                system_instruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
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

            if (response.ok) {
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                return res.status(200).json({ text: text || "Không có nội dung trả về." });
            }

            if (response.status === 429 || response.status === 503) {
                console.warn(`[API/Chat] Model ${model} overloaded. Switching...`);
                lastError = data.error?.message;
                await sleep(500); 
                continue;
            }

            throw new Error(data.error?.message || "API Error");

        } catch (e) {
            console.error(`[API/Chat] Error with ${model}:`, e.message);
            lastError = e.message;
        }
    }

    return res.status(429).json({ 
        text: "⚠️ Hệ thống AI đang quá tải (Quota Exceeded). Vui lòng thử lại sau 30 giây.",
        error: lastError 
    });

  } catch (e) {
    console.error("[API/Chat] Internal Handler Error:", e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
}
