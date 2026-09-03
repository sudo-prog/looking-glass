/**
 * Client-side global error telemetry.
 *
 * Installs window.onerror + window.onunhandledrejection handlers that build a
 * structured payload and POST it (best-effort, fire-and-forget) to /api/log.
 * If the endpoint is unreachable, it still console.errors a structured payload
 * so the event is never silently lost during local dev / offline.
 *
 * Usage:
 *   import { initErrorTelemetry } from '../utils/errorTelemetry.js';
 *   initErrorTelemetry();
 */

const ENDPOINT = '/api/log';

// Capture the last server request id (e.g. from a failed /api/ai/chat call)
// so client errors can be correlated with server-side traces.
let lastServerRequestId = null;
export function setLastServerRequestId(id) {
  if (id) lastServerRequestId = String(id).slice(0, 128);
}
export function getLastServerRequestId() {
  return lastServerRequestId;
}

let initialised = false;

function buildPayload(level, detail) {
  return {
    event: detail.event || (level === 'error' ? 'window_error' : 'window_rejection'),
    level,
    time: new Date().toISOString(),
    message: detail.message ? String(detail.message).slice(0, 2000) : '',
    url: typeof window !== 'undefined' ? window.location?.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    requestId: lastServerRequestId || undefined,
    line: detail.line ?? undefined,
    col: detail.col ?? undefined,
    stack: detail.stack ? String(detail.stack).slice(0, 4000) : undefined,
    extra: detail.extra || undefined,
  };
}

function send(level, detail) {
  const payload = buildPayload(level, detail);
  // Always emit a structured console line (visible in devtools / local dev).
  // eslint-disable-next-line no-console
  console.error('[telemetry]', JSON.stringify(payload));

  if (typeof fetch !== 'function') return;
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* best-effort: swallow network failures */
    });
  } catch {
    /* never let telemetry throw into app code */
  }
}

/**
 * Install the global handlers. Safe to call once.
 * @param {object} [opts]
 * @param {boolean} [opts.captureUnhandledRejection=true]
 */
export function initErrorTelemetry(opts = {}) {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;

  window.addEventListener('error', (event) => {
    // Resource load errors (img/script) don't have an error object — skip those
    // noisily; keep the meaningful script errors.
    const isResourceError = !event.error && event.target && event.target !== window;
    if (isResourceError) return;
    send('error', {
      message: event.message,
      line: event.lineno,
      col: event.colno,
      stack: event.error?.stack,
      extra: { filename: event.filename },
    });
  });

  if (opts.captureUnhandledRejection !== false) {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      send('error', {
        event: 'unhandled_rejection',
        message: reason?.message || (typeof reason === 'string' ? reason : 'Unhandled promise rejection'),
        stack: reason?.stack,
        extra: { type: typeof reason },
      });
    });
  }
}

/** Manual reporter for caught errors you still want tracked. */
export function reportError(err, extra = {}) {
  send('error', {
    event: 'manual_report',
    message: err?.message || String(err),
    stack: err?.stack,
    extra,
  });
}
