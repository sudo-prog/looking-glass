const CACHE_NAME = 'looking-glass-v2';
const SHELL_FILES = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(SHELL_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Network-first for documents, scripts, and styles to always get latest
  if (e.request.destination === 'document' || e.request.destination === 'script' || e.request.destination === 'style') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          // Update cache with fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
