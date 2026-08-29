self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basit: ağı kullan, hata olursa hiçbir şey yapma
  event.respondWith(fetch(event.request).catch(() => undefined));
});
