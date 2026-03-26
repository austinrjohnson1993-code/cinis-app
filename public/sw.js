const CACHE_NAME = 'cinis-v20260324';
const PRECACHE_URLS = ['/', '/dashboard', '/login'];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for JS/CSS — always try fresh to prevent stale assets
  if (event.request.url.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(function() {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Network-first for navigation, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Cache successful navigation responses
        if (response.ok && event.request.mode === 'navigate') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(cached => {
          return cached || caches.match('/dashboard');
        });
      })
  );
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Cinis';
  const options = {
    body: data.body || 'Time to check in.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || 'cinis-checkin',
    renotify: true,
    data: { url: data.url || '/dashboard' },
    actions: data.actions || []
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
