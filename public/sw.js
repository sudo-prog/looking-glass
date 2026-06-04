const CACHE_NAME = 'looking-glass-v1';
const SHELL_FILES = ['/', '/index.html', '/src/main.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Cache-first for app shell
  if (e.request.destination === 'document' || e.request.destination === 'script' || e.request.destination === 'style') {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    return;
  }
  // Network-first for API calls
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
