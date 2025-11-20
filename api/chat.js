export default async function handler(req, res) {
  // Cấu hình CORS cho phép gọi từ Frontend
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

    // Ưu tiên lấy key từ biến môi trường server
    const apiKey = process.env.API_KEY || process.env.VITE_API_KEY || 'AIzaSyDFTZ0D_EOchhykhh9QqBxSyy2wO1tpn-c';

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key chưa được cấu hình trên server.' });
    }

    // Chuẩn bị payload theo định dạng REST API của Google Gemini
    const payload = {
      contents: [
        ...(history || []), // Lịch sử chat đã được format từ client
        { role: 'user', parts: [{ text: message }] } // Tin nhắn mới
      ],
      // Gemini 1.5/2.5 hỗ trợ system_instruction qua REST API
      system_instruction: systemInstruction ? {
        parts: [{ text: systemInstruction }]
      } : undefined,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    };

    const MODEL_NAME = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google Gemini API Error:", JSON.stringify(data, null, 2));
      return res.status(response.status).json({ 
        error: data.error?.message || 'Lỗi khi gọi Google API từ server.' 
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        return res.status(500).json({ error: 'Không nhận được phản hồi văn bản từ AI.' });
    }

    res.status(200).json({ text });

  } catch (error) {
    console.error('Server Function Error:', error);
    res.status(500).json({ error: error.toString() });
  }
}