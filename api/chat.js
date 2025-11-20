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

    const apiKey = process.env.VITE_API_KEY || 
                   process.env.API_KEY || 
                   process.env.GOOGLE_API_KEY ||
                   'AIzaSyDFTZ0D_EOchhykhh9QqBxSyy2wO1tpn-c'; 

    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server chưa tìm thấy API Key.' 
      });
    }

    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const MODEL_NAME = 'gemini-2.5-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", JSON.stringify(data, null, 2));
      
      if (response.status === 403) {
        return res.status(403).json({ 
            error: 'API Key bị chặn (403). Có thể do giới hạn Android/iOS hoặc IP không hợp lệ.' 
        });
      }
      
      return res.status(response.status).json({ 
          error: data.error?.message || 'Lỗi từ Google API' 
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ text });

  } catch (error) {
    console.error('Internal Server Error:', error);
    res.status(500).json({ error: error.message });
  }
}