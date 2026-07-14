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

// Map the app's short model names to VALID OpenRouter FREE-TIER model IDs ONLY.
// Every value ends in ':free' — no paid model is ever selected. Unknown short
// names fall through to the DEFAULT_FREE_MODEL below.
const OPENROUTER_MODEL_MAP = {
  'gemini-3.5-flash': 'google/gemma-4-26b-a4b-it:free',
  'gemini-3.5-flash-thinking': 'meta-llama/llama-3.3-70b-instruct:free',
  'gemini-3.5-flash-thinking-lite': 'meta-llama/llama-3.2-3b-instruct:free',
  'gemini-3.1-pro': 'nvidia/nemotron-3-super-120b-a12b:free',
  'gemini-auto': 'google/gemma-4-26b-a4b-it:free',
  'gemini-flash-lite': 'meta-llama/llama-3.2-3b-instruct:free',
  'gpt-4o-mini': 'openai/gpt-oss-20b:free',
  'claude-sonnet-4-5': 'nousresearch/hermes-3-llama-3.1-405b:free',
  'tencent/hy3': 'tencent/hy3:free',
  'hy3': 'tencent/hy3:free',
};
const DEFAULT_FREE_MODEL = 'tencent/hy3:free';

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

    // Resolve upstream. Priority order (all env-driven, server-side only):
    //   1. OpenRouter (OPENROUTER_API_KEY) — recommended, non-personal key
    //   2. Google native OpenAI-compat (GEMINI_API_KEY)
    //   3. Legacy cookie-scraper web2api (GEMINI_WEB2API_URL)
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const web2apiUrl = process.env.GEMINI_WEB2API_URL;
    const web2apiKey = process.env.GEMINI_WEB2API_KEY;

    let endpoint;
    let authHeader = null;
    const extraHeaders = {};
    let modelForRequest = model;
    if (openrouterKey) {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      authHeader = `Bearer ${openrouterKey}`;
      extraHeaders['HTTP-Referer'] = 'https://looking-glass-eta.vercel.app';
      extraHeaders['X-Title'] = 'Looking Glass AI';
      modelForRequest = OPENROUTER_MODEL_MAP[model] || DEFAULT_FREE_MODEL;
    } else if (geminiKey) {
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      authHeader = `Bearer ${geminiKey}`;
    } else if (web2apiUrl) {
      endpoint = `${web2apiUrl.replace(/\/$/, '')}/v1/chat/completions`;
      if (web2apiKey) authHeader = `Bearer ${web2apiKey}`;
    } else {
      logError('ai_chat_no_upstream', requestId, new Error('No AI upstream configured'), {});
      return res.status(503).json({ error: 'AI not configured (set OPENROUTER_API_KEY)' });
    }

    const headers = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const callUpstream = (retriesLeft) => {
      return fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelForRequest,
          max_tokens: body.max_tokens || 2000,
          temperature: body.temperature ?? 0.3,
          messages,
          stream: false,
        }),
      }).then(async (r) => {
        if (!r.ok) {
          const detail = await r.text().catch(() => '');
          // 429 (rate-limit) / 5xx are often transient on the free Gemini web endpoint.
          if ((r.status === 429 || r.status >= 500) && retriesLeft > 0) {
            await new Promise((res) => setTimeout(res, 1200));
            return callUpstream(retriesLeft - 1);
          }
          logError('ai_chat_upstream_error', requestId, new Error('upstream non-2xx'), {
            status: r.status,
            detailLength: detail?.length ?? 0,
            model,
          });
          return res.status(r.status === 429 ? 502 : r.status).json({
            error: r.status === 429 ? 'AI provider rate-limited (retry shortly)' : 'Gemini Web2API error',
            status: r.status,
          });
        }
        return r.json();
      });
    };

    return callUpstream(2)
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
