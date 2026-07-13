// Lightweight structured logger for serverless functions.
// Emits one JSON line per event with a stable event name + correlation id.
// No secrets/PII: request bodies are NOT logged, only a redacted shape.
function logError(event, requestId, err, extra = {}) {
  const payload = {
    event,
    requestId,
    level: 'error',
    time: new Date().toISOString(),
    message: err?.message || String(err),
    stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
    ...extra,
  };
  // structured single-line JSON so it is queryable in Vercel/most log backends
  console.error(JSON.stringify(payload));
}

function newRequestId() {
  // crypto is available globally in modern Node/Vercel runtimes
  try {
    return globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function handler(req, res) {
  const requestId = req.headers?.['x-request-id'] || newRequestId();
  // Correlation id echoed back so clients can attach it to any client-side telemetry
  res.setHeader('x-request-id', requestId);

  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { model, messages } = body || {};
    if (!model) {
      return res.status(400).json({ error: 'Missing model' });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing messages' });
    }

    const targetBase = (process.env.GEMINI_WEB2API_URL || 'http://localhost:8081').replace(/\/$/, '');
    const endpoint = `${targetBase}/v1/chat/completions`;

    const headers = {
      'Content-Type': 'application/json',
    };
    const apiKey = process.env.GEMINI_WEB2API_KEY;
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return fetch(endpoint, {
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
          let detail = '';
          try { detail = await r.text(); } catch { /* ignore */ }
          logError('ai_chat_upstream_error', requestId, new Error('upstream non-2xx'), {
            status: r.status,
            detailLength: detail?.length ?? 0,
          });
          return res.status(r.status).json({ error: 'Gemini Web2API error', status: r.status });
        }
        return r.json();
      })
      .then((data) => {
        const text = data?.choices?.[0]?.message?.content || '';
        return res.status(200).json({
          choices: [
            { message: { role: 'assistant', content: text } },
          ],
        });
      })
      .catch((err) => {
        logError('ai_chat_upstream_failure', requestId, err, { stage: 'fetch' });
        return res.status(502).json({ error: 'Upstream error' });
      });
  } catch (err) {
    // Catch-all: never let an unhandled throw produce a Vercel 500 with no trace.
    logError('ai_chat_unhandled', requestId, err);
    return res.status(500).json({ error: 'Internal error', requestId });
  }
}
