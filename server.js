import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = new URL('./dist', import.meta.url).pathname;
const PORT = process.env.PORT ?? 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  let url = req.url.replace(/\?.*$/, '').replace(/^\/looking-glass/, '') || '/';
  let file = join(DIST, url === '/' ? 'index.html' : url);
  if (!existsSync(file)) file = join(DIST, 'index.html');
  res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  createReadStream(file)
    .on('error', () => { res.writeHead(404); res.end('Not found'); })
    .pipe(res);
}).listen(PORT, () => console.log(`Looking Glass → http://localhost:${PORT}/looking-glass/`));
