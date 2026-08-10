export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  var apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'OPENROUTER_API_KEY is not set on the server.'
    });
  }
  var messages = (req.body || {}).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array is required' });
  }
  var trimmed = messages.slice(-20).map(function (m) {
    return {
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 8000)
    };
  });
  var systemMessage = {
    role: 'system',
    content: 'You are GrepMind, the assistant built by GrepLabs. Be concise, warm, and useful. GrepMind Agents launch in October.'
  };
  try {
    var response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'HTTP-Referer': 'https://grep-mind-demo.vercel.app',
        'X-Title': 'GrepMind'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        max_tokens: 1024,
        messages: [systemMessage].concat(trimmed)
      })
    });
    if (!response.ok) {
      var errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }
    var data = await response.json();
    var reply = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content.trim()
      : '';
    return res.status(200).json({ reply: reply || "I couldn't generate a reply just now." });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach OpenRouter', detail: String(err) });
  }
}
