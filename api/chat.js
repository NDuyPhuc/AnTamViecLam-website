export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, history } = req.body;
    
    // Prioritize VITE_API_KEY as defined in Vercel project settings
    const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      console.error("API Key is missing in server environment.");
      return res.status(500).json({ error: 'Server configuration error: API Key missing' });
    }

    // Construct the conversation history for Gemini
    // History from client comes as [{ role: 'user'|'model', text: '...' }]
    const contents = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.text }]
    }));

    // Append the current user prompt (which includes the context)
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    // Call Google Gemini API via REST
    // Using gemini-2.5-flash as the model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        // Optional: Add generation config if needed
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", JSON.stringify(data, null, 2));
      const errorMessage = data.error?.message || 'Failed to fetch from Gemini API';
      throw new Error(errorMessage);
    }

    // Extract text from response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error('No content returned from Gemini');
    }

    res.status(200).json({ text });

  } catch (error) {
    console.error('Error in chat handler:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}