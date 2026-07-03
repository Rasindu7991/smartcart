const CACHE_NAME = 'smartcart-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/api.js',
  '/js/store.js',
  '/js/ui.js',
  '/js/modules/charts.js',
  '/js/modules/camera.js',
  '/js/modules/barcode.js',
  '/js/views/dashboard.js',
  '/js/views/lists.js',
  '/js/views/listDetail.js',
  '/js/views/shopping.js',
  '/js/views/analytics.js',
  '/js/views/optimizer.js',
  '/js/views/settings.js',
  '/manifest.json',
];

// ── Install: cache static assets ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for static ─────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always network for API calls
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline - API unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
        return response;
      });
    })
  );
});

// ── Background sync (future: sync offline changes) ───────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending') {
    // Reserved for future offline queue sync
    console.log('[SW] Background sync triggered');
  }
});
