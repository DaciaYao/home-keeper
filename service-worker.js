/* ============================================================
 * service-worker.js —— PWA 离线缓存
 * 安装时预缓存核心资源；运行时优先读缓存，失败再走网络。
 * ============================================================ */
const CACHE_NAME = 'family-keeper-v1';
const ASSETS = [
  '/', '/index.html', '/kitchen.html', '/wardrobe.html',
  '/manifest.json',
  '/assets/css/style.css',
  '/assets/js/store.js', '/assets/js/cloud.js',
  '/assets/js/app.js', '/assets/js/items-page.js',
  '/assets/icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
