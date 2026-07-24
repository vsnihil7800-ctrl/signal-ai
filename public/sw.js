const CACHE_NAME = 'signal-ai-cache-v3';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass service worker caching for non-GET or non-http requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. API requests: Skip interception entirely (no caching to prevent stale database state)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Next.js hot-reloads and dev server assets: Skip interception entirely
  if (url.pathname.startsWith('/_next/webpack-hmr') || url.pathname.includes('hot-update')) {
    return;
  }

  // 3. HTML pages & Navigation requests: Skip interception entirely to avoid auth redirect issues
  const acceptHeader = event.request.headers.get('accept') || '';
  if (
    event.request.mode === 'navigate' || 
    acceptHeader.includes('text/html') || 
    url.pathname.endsWith('.html') ||
    (!url.pathname.includes('.') && !url.pathname.startsWith('/_next/'))
  ) {
    return;
  }

  // 4. Static assets, fonts, icons, manifest: Cache-First with Network fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache successful responses of static assets
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
