/**
 * 退職リスク診断 - Service Worker
 * Cache-first strategy for offline support
 */

const CACHE_NAME = 'rra-v16';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/components.css',
  './js/app.js',
  './js/questions.js',
  './js/scoring.js',
  './js/charts.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Handle messages from the app (e.g., reminders)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_REMINDER') {
    // Store reminder info for later notification
    const reminderDate = new Date(event.data.date);
    const now = Date.now();
    const delay = reminderDate.getTime() - now;
    if (delay > 0 && delay <= 7776000000) { // Max 90 days
      setTimeout(() => {
        self.registration.showNotification('はたらく環境診断', {
          body: 'リマインダー: もう一度診断して、変化を確認しましょう。',
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          tag: 'rra-reminder',
          data: { url: './' }
        });
      }, Math.min(delay, 2147483647)); // setTimeout max safe value
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('./');
    })
  );
});

// Fetch: cache-first, network fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new successful responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
