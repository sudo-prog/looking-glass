// Vercel serverless log sink.
// Receives structured client-side error/telemetry payloads from
// src/utils/errorTelemetry.js and writes them as queryable structured logs.
// This is the /api/log endpoint referenced by the client telemetry module.

function newRequestId() {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function handler(req, res) {
  const requestId = req.headers?.['x-request-id'] || newRequestId();
  res.setHeader('x-request-id', requestId);

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

  // Accept a single event or an array of events.
  const events = Array.isArray(body) ? body : [body];
  const safe = [];
  for (const ev of events.slice(0, 50)) {
    // Redact anything that looks like a secret before logging.
    const redacted = redact(ev);
    safe.push({
      event: redacted.event || 'client_log',
      channel: 'client',
      level: redacted.level || 'error',
      requestId: redacted.requestId || null,
      time: redacted.time || new Date().toISOString(),
      message: redacted.message ? String(redacted.message).slice(0, 2000) : undefined,
      url: redacted.url ? String(redacted.url).slice(0, 2000) : undefined,
      userAgent: redacted.userAgent ? String(redacted.userAgent).slice(0, 500) : undefined,
      // Stack/line info for JS errors.
      stack: redacted.stack ? String(redacted.stack).slice(0, 4000) : undefined,
      line: redacted.line ?? undefined,
      col: redacted.col ?? undefined,
      // Any extra structured fields (component, action, etc.) — bounded.
      extra: redactExtra(redacted.extra),
    });
  }

  // One structured line per event.
  for (const e of safe) {
    console.error(JSON.stringify(e));
  }

  return res.status(202).json({ ok: true, count: safe.length, requestId });
}

const SECRET_KEYS = /(password|secret|token|apikey|api_key|authorization|cookie|set-cookie|key|session)/i;

function redact(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEYS.test(k)) continue; // drop anything that looks like a secret
    out[k] = v;
  }
  return out;
}

function redactExtra(extra) {
  if (!extra || typeof extra !== 'object') return undefined;
  const out = {};
  let n = 0;
  for (const [k, v] of Object.entries(extra)) {
    if (n++ >= 20) break;
    if (SECRET_KEYS.test(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 1000) : v;
  }
  return out;
}
