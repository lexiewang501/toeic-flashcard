// TOEIC Master PWA Service Worker
const CACHE_NAME = 'toeic-master-v6';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './words-data.js',
  './words.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png'
];

// 安裝事件：預先快取核心靜態檔案
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 啟動事件：清除舊版快取並立即接管頁面
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 攔截網路請求：Stale-While-Revalidate 快取策略（快取優先秒開，背景檢查更新，離線 100% 可用）
self.addEventListener('fetch', (event) => {
  // 只處理 GET 請求與 HTTP/HTTPS 協定
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 背景非同步發送網路請求以更新快取
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // 網路離線時不拋出錯誤，由下方 cachedResponse 接管
        });

      // 如果有快取，立即回傳快取；若無快取（例如首次訪問），等待網路請求
      return cachedResponse || fetchPromise.then((res) => {
        if (res) return res;
        // 若為 HTML 頁面請求且離線時，回傳首頁快取
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});
