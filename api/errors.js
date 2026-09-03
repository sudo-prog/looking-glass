// Vercel serverless error-log viewer.
// GET /api/errors -> returns the most recent buffered client/server errors
// (newest first). This is the "debug viewer" the chief-of-staff agent and
// onboard AI agents poll to confirm the app is error-free without scraping
// the Vercel console. Buffer is per-instance (cold starts clear it); the
// durable record is the console.error(JSON) line emitted by /api/log.

// Module-scoped buffer survives warm invocations; cleared on cold start.
const MAX = 200;
const buffer = (globalThis.__lgErrorBuffer = globalThis.__lgErrorBuffer || []);

export default function handler(req, res) {
  const requestId =
    req.headers?.["x-request-id"] || `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.setHeader("x-request-id", requestId);

  if (req.method === "DELETE") {
    buffer.length = 0;
    return res.status(200).json({ ok: true, cleared: true });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, DELETE");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const recent = [...buffer].reverse();
  return res.status(200).json({ count: recent.length, cap: MAX, errors: recent });
}

// Helper exported for /api/log to push into the same buffer.
export function recordError(e) {
  buffer.push(e);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}
