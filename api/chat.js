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

    // 1. Tìm API Key (Ưu tiên biến môi trường, fallback sang key bạn cung cấp nếu server chưa nhận env)
    const apiKey = process.env.VITE_API_KEY || 
                   process.env.API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   process.env.NEXT_PUBLIC_API_KEY ||
                   'AIzaSyCB_MqUl4A1k8SNTkrf5vwmmBtvCpSi5IM'; // Fallback key for immediate fix

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server chưa tìm thấy API Key. Vui lòng kiểm tra cấu hình.' 
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

    // 3. Sử dụng model gemini-1.5-flash (Ổn định hơn cho Free Tier)
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

    // 4. Xử lý các lỗi cụ thể từ Google
    if (!response.ok) {
      console.error("Google API Error:", JSON.stringify(data, null, 2));

      // Lỗi 429: Quota Exceeded
      if (response.status === 429) {
          return res.status(429).json({
              error: 'Chatbot đang quá tải lượt dùng miễn phí. Vui lòng đợi 1 phút rồi thử lại.'
          });
      }
      
      // Lỗi Key
      if (data.error && data.error.message && (data.error.message.includes("API key not valid") || data.error.message.includes("blocked"))) {
          return res.status(403).json({
              error: `Lỗi xác thực API Key. Vui lòng kiểm tra lại cấu hình.`
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