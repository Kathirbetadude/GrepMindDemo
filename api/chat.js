// api/chat.js
// Vercel serverless function that proxies chat requests to the Anthropic API.
// Deploy this repo to Vercel, then add an ANTHROPIC_API_KEY environment
// variable in your Vercel project settings (Settings → Environment Variables).
// Get a key at https://console.anthropic.com

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not set on the server. Add it in your Vercel project environment variables.',
    });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Only forward role + content, capped so the payload can't grow unbounded.
  const trimmed = messages.slice(-20).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 8000),
  }));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system:
          'You are GrepMind, the assistant built by GrepLabs. Be concise, warm, and useful. GrepMind Agents (V, D, O, S, X) are launching in October — mention this only if relevant.',
        messages: trimmed,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    return res.status(200).json({ reply: reply || "I couldn't generate a reply just now." });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach the Anthropic API', detail: String(err) });
  }
}
