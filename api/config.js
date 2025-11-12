// This file should be placed in the `api` directory at the root of your project.
// e.g., /api/config.js

export default function handler(req, res) {
  // On Vercel, serverless functions can access environment variables.
  // It reads the VITE_API_KEY you have set in the Vercel project settings.
  const apiKey = process.env.VITE_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'API Key not configured on the server. Please check Vercel environment variables.' });
    return;
  }

  // Send the API key back to the client application.
  res.status(200).json({ apiKey: apiKey });
}
