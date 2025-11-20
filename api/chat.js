export default async function handler(req, res) {
  // Cấu hình CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Xử lý preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history, systemInstruction } = req.body;

    // QUAN TRỌNG: Chỉ lấy key từ biến môi trường. 
    // Tuyệt đối không hardcode key vào đây để tránh lộ và tránh lỗi Android Restriction khi chạy trên Server Vercel.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      console.error("Server Error: API_KEY is missing in Vercel Environment Variables.");
      return res.status(500).json({ error: 'Server Misconfiguration: Missing API Key.' });
    }

    // Model Gemini 2.5 Flash
    const MODEL_NAME = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        ...(history || []),
        { role: 'user', parts: [{ text: message }] }
      ],
      system_instruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      // Log lỗi chi tiết ra Vercel Function Logs để debug
      console.error("Gemini API Error:", JSON.stringify(data, null, 2));
      
      // Trả về lỗi cho client
      return res.status(response.status).json({ 
        error: data.error?.message || 'Lỗi từ Google Gemini API.' 
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        return res.status(500).json({ error: 'AI không trả về nội dung văn bản.' });
    }

    res.status(200).json({ text });

  } catch (error) {
    console.error('Vercel Function Crash:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}