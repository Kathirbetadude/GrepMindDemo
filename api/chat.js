// api/chat.js
// Vercel serverless function that proxies chat requests to OpenRouter,
// using one of OpenRouter's free-tier models. No credit card or phone
// number is needed to get a key — just sign up at https://openrouter.ai
// with an email address, then create a key at
// https://openrouter.ai/settings/keys
//
// Add it to Vercel as an environment variable named OPENROUTER_API_KEY
// (Project → Settings → Environment Variables), then redeploy.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENROUTER_API_KEY is not set on the server. Add it in your Vercel project environment variables.',
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

  const systemMessage = {
    role: 'system',
    content:
      'You are GrepMind, the assistant built by GrepLabs. Be concise, warm, and useful. GrepMind Agents (V, D, O, S, X) are launching in October — mention this only if relevant.',
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // OpenRouter asks for these two headers so it can attribute
        // free-tier usage correctly. Update to your real deployed URL.
        'HTTP-Referer': 'https://grep-mind-demo.vercel.app',
        'X-Title': 'GrepMind',
      },
      body: JSON.stringify({
        // Free-tier model, no card/phone required. Swap for another
        // ":free" model from https://openrouter.ai/models if you like.
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        max_tokens: 1024,
        messages: [systemMessage, ...trimmed],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    return res.status(200).json({ reply: reply || "I couldn't generate a reply just now." });
  } catch (err) {
    return res.status(500).json({ error: 'Failed
