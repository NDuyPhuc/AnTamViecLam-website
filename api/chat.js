export default async function handler(req, res) {
  // Cấu hình CORS để cho phép request từ frontend
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

    // Lấy API Key từ biến môi trường.
    // Ưu tiên VITE_API_KEY (thường dùng trong Vercel project settings cho Vite app)
    const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      console.error("Server Error: API Key is missing.");
      return res.status(500).json({ 
        error: 'API Key chưa được cấu hình trên Vercel. Vui lòng kiểm tra Environment Variables.' 
      });
    }

    // Chuẩn bị dữ liệu cho Gemini REST API
    // Map history từ client (role: 'user'/'model') sang format của Gemini
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Thêm câu hỏi mới nhất của người dùng
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // Gọi Google Gemini API
    // Lưu ý: Sử dụng model gemini-2.5-flash hoặc gemini-1.5-flash tùy vào key của bạn hỗ trợ
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Thêm User-Agent để tránh bị chặn bởi một số firewall đơn giản
        'User-Agent': 'AnTamViecLam-VercelServer/1.0'
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
      console.error("Google API Error:", JSON.stringify(data, null, 2));
      
      // Kiểm tra lỗi Android Blocked cụ thể để báo lỗi rõ ràng hơn
      if (data.error && data.error.message && data.error.message.includes("Android client application")) {
          return res.status(403).json({
              error: "API Key hiện tại bị giới hạn cho Android App. Vui lòng tạo API Key mới (Unrestricted) và cập nhật vào Vercel Environment Variables."
          });
      }

      const errorMessage = data.error?.message || 'Lỗi từ Google Gemini API';
      return res.status(response.status).json({ error: errorMessage, details: data.error });
    }

    // Trích xuất câu trả lời
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