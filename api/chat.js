export default async function handler(req, res) {
  // Cấu hình CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, history } = req.body;

    // 1. Tìm API Key
    const apiKey = process.env.VITE_API_KEY || 
                   process.env.API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   process.env.NEXT_PUBLIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server chưa tìm thấy API Key. Vui lòng kiểm tra Environment Variables trên Vercel.' 
      });
    }

    // 2. Chuẩn bị dữ liệu
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // 3. Sử dụng model gemini-2.5-flash theo chuẩn mới nhất
    const MODEL_NAME = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AnTamViecLam-App/1.0'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
        }
      })
    });

    const data = await response.json();

    // 4. Xử lý các lỗi cụ thể từ Google
    if (!response.ok) {
      console.error("Google API Error:", JSON.stringify(data, null, 2));

      // Lỗi 429: Quota Exceeded (Hết lượt gọi miễn phí trong phút)
      if (response.status === 429) {
          return res.status(429).json({
              error: 'Hệ thống AI đang quá tải (Hết lượt gọi miễn phí trong phút). Vui lòng đợi 30 giây rồi thử lại.'
          });
      }
      
      // Lỗi Key Android
      if (data.error && data.error.message && data.error.message.includes("Android client application")) {
          return res.status(403).json({
              error: `Lỗi Key: API Key bị giới hạn Android. Hãy dùng Key "Unrestricted" mới.`
          });
      }

      const errorMessage = data.error?.message || 'Lỗi từ Google Gemini API';
      return res.status(response.status).json({ error: errorMessage });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        return res.status(500).json({ error: 'Không nhận được phản hồi nội dung từ Gemini.' });
    }

    res.status(200).json({ text });

  } catch (error) {
    console.error('Internal Server Error in api/chat.js:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}