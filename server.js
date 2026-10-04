/**
 * Looking Glass — production static server.
 *
 * Serves the Vite build output from ./dist with an SPA fallback so client-side
 * routes resolve to index.html. Run with `npm start` (PORT overrides the port).
 */
import express from 'express';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;

// Optional mount prefix — set BASE_PATH=/looking-glass when serving from a
// sub-directory (matches vite.config.js `base`).
const BASE_PATH = (process.env.BASE_PATH ?? '').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

if (!existsSync(DIST)) {
  console.error('[server] dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const app = express();

app.disable('x-powered-by');

if (BASE_PATH) {
  app.use(BASE_PATH, express.static(DIST, { index: false, extensions: ['html'] }));
}

// Hashed build assets are immutable; everything else revalidates.
app.use(express.static(DIST, {
  index: false,
  setHeaders(res, filePath) {
    res.setHeader(
      'Content-Type',
      MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    );
    const isHashed = /\/assets\/.+-[A-Za-z0-9_-]{8,}\./.test(filePath);
    res.setHeader(
      'Cache-Control',
      isHashed ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
    );
  },
}));

// SPA fallback — never rewrite asset requests that fell through.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/')) return next();
  if (extname(req.path)) return next();
  const index = join(DIST, normalize('index.html'));
  if (!existsSync(index)) return next();
  res.setHeader('Content-Type', MIME['.html']);
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(index);
});

// 404 for genuinely missing assets.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

const server = app.listen(PORT, () => {
  console.log(`Looking Glass → http://localhost:${PORT}${BASE_PATH}/`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}