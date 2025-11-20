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

    // 1. Tìm API Key từ nhiều nguồn biến môi trường khác nhau để đảm bảo tìm thấy
    const apiKey = process.env.VITE_API_KEY || 
                   process.env.API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   process.env.NEXT_PUBLIC_API_KEY;

    // 2. Debug Log (Xem trong Vercel Functions tab)
    if (apiKey) {
        console.log(`Server is using API Key starting with: ${apiKey.substring(0, 4)}...`);
    } else {
        console.error("Server Error: No API Key found in environment variables.");
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server chưa tìm thấy API Key. Vui lòng kiểm tra Environment Variables trên Vercel và Redeploy.' 
      });
    }

    // 3. Chuẩn bị dữ liệu
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // 4. Đổi sang model gemini-1.5-flash (Ổn định hơn)
    const MODEL_NAME = 'gemini-1.5-flash';
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

    if (!response.ok) {
      console.error("Google API Error Full:", JSON.stringify(data, null, 2));
      
      // Xử lý lỗi Key Android cụ thể
      if (data.error && data.error.message && data.error.message.includes("Android client application")) {
          return res.status(403).json({
              error: `API Key hiện tại (${apiKey.substring(0,4)}...) vẫn bị nhận diện là Android Key. Hãy tạo Key mới loại "No restriction" và REDEPLOY lại Vercel.`
          });
      }

      const errorMessage = data.error?.message || 'Lỗi từ Google Gemini API';
      return res.status(response.status).json({ error: errorMessage, details: data.error });
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