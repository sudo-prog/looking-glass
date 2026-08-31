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

// Map the app's short model names to OmniRoute virtual models.
// Every value uses OmniRoute's auto-routing models — no paid model is ever selected.
const OMNIRUTE_MODEL_MAP = {
  'auto/best-free': 'auto/best-free',
  'auto/coding:free': 'auto/coding:free',
  'auto/best-chat': 'auto/best-chat',
  'auto/best-coding-fast': 'auto/best-coding-fast',
  'auto/best-coding': 'auto/best-coding',
  'auto/best-reasoning': 'auto/best-reasoning',
};
const DEFAULT_OMNIRUTE_MODEL = 'auto/best-free';

// OpenRouter free-tier model map — only valid :free slugs. Paid models are
// never sent upstream. If the model is already a valid :free slug it passes
// through unchanged.
const OPENROUTER_MODEL_MAP = {};
const DEFAULT_FREE_MODEL = 'z-ai/glm-5.2:free';

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

    const { model, messages, provider: bodyProvider } = body || {};
    if (!model) {
      return res.status(400).json({ error: 'Missing model' });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing messages' });
    }

    // Resolve upstream. Priority order (all env-driven, server-side only):
    //   1. If the client explicitly requests openrouter, route there (if key exists).
    //   2. OmniRoute (LLM_BASE_URL + LLM_API_KEY) — primary, local gateway
    //   3. OpenRouter (OPENROUTER_API_KEY) — fallback
    const omnirouteUrl = process.env.LLM_BASE_URL;
    const omnirouteKey = process.env.LLM_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    let endpoint;
    let authHeader = null;
    const extraHeaders = {};
    let modelForRequest = model;
    let resolvedProvider = null;

    // 0. Client-explicit openrouter upstream
    if (bodyProvider === 'openrouter' && openrouterKey) {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      authHeader = `Bearer ${openrouterKey}`;
      extraHeaders['HTTP-Referer'] = 'https://looking-glass-eta.vercel.app';
      extraHeaders['X-Title'] = 'Looking Glass AI';
      // Only allow valid :free slugs or auto-map — never paid models
      modelForRequest = model?.endsWith(':free') || model?.startsWith('auto/')
        ? model
        : (OPENROUTER_MODEL_MAP[model] || DEFAULT_FREE_MODEL);
      resolvedProvider = 'openrouter';
    // 1. OmniRoute (primary)
    } else if (omnirouteUrl && omnirouteKey) {
      endpoint = omnirouteUrl;
      authHeader = `Bearer ${omnirouteKey}`;
      modelForRequest = model?.startsWith('auto/') ? model : (OMNIRUTE_MODEL_MAP[model] || DEFAULT_OMNIRUTE_MODEL);
      resolvedProvider = 'omniroute';
    // 2. OpenRouter (fallback)
    } else if (openrouterKey) {
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      authHeader = `Bearer ${openrouterKey}`;
      extraHeaders['HTTP-Referer'] = 'https://looking-glass-eta.vercel.app';
      extraHeaders['X-Title'] = 'Looking Glass AI';
      modelForRequest = model?.endsWith(':free') || model?.startsWith('auto/')
        ? model
        : (OPENROUTER_MODEL_MAP[model] || DEFAULT_FREE_MODEL);
      resolvedProvider = 'openrouter';
    } else {
      logError('ai_chat_no_upstream', requestId, new Error('No AI upstream configured'), {});
      return res.status(503).json({ error: 'AI not configured (set LLM_BASE_URL and LLM_API_KEY for OmniRoute, or OPENROUTER_API_KEY for OpenRouter)' });
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
          // 429 / 5xx may be transient — retry up to retriesLeft times
          if ((r.status === 429 || r.status >= 500) && retriesLeft > 0) {
            await new Promise((res) => setTimeout(res, 1200));
            return callUpstream(retriesLeft - 1);
          }
          // Surface real upstream status + readable error to the client
          let readableError;
          try {
            const parsed = JSON.parse(detail);
            readableError = parsed?.error?.message || parsed?.error || detail || r.statusText;
          } catch {
            readableError = detail || r.statusText;
          }
          logError('ai_chat_upstream_error', requestId, new Error('upstream non-2xx'), {
            status: r.status,
            provider: resolvedProvider,
            detailLength: detail?.length ?? 0,
            model: modelForRequest,
          });
          return res.status(r.status).json({
            error: `${resolvedProvider || 'upstream'} error ${r.status}: ${readableError}`,
            status: r.status,
            provider: resolvedProvider,
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
