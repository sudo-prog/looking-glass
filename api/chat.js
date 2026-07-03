export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const { model, messages } = body || {}
  if (!model) {
    return res.status(400).json({ error: 'Missing model' })
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing messages' })
  }

  const targetBase = (process.env.GEMINI_WEB2API_URL || 'http://localhost:8081').replace(/\/$/, '')
  const endpoint = `${targetBase}/v1/chat/completions`

  const headers = {
    'Content-Type': 'application/json',
  }
  const apiKey = process.env.GEMINI_WEB2API_KEY
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
  }

  fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: body.max_tokens || 2000,
      temperature: body.temperature ?? 0.3,
      messages,
    }),
  })
    .then(async (r) => {
      if (!r.ok) {
        let detail = ''
        try { detail = await r.text() } catch {}
        return res.status(r.status).json({ error: 'Gemini Web2API error', status: r.status, detail })
      }
      return r.json()
    })
    .then((data) => {
      const text = data?.choices?.[0]?.message?.content || ''
      return res.status(200).json({
        choices: [
          { message: { role: 'assistant', content: text } }
        ]
      });
    })
    .catch((err) => {
      return res.status(502).json({ error: 'Upstream error', detail: err?.message || String(err) })
    })
}
