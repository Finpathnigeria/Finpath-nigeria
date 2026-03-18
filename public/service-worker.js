/* ============================================================
   FinPath Nigeria — Service Worker
   Handles: offline caching, background sync, push notifications
   ============================================================ */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE  = `finpath-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `finpath-dynamic-${CACHE_VERSION}`;
const API_CACHE     = `finpath-api-${CACHE_VERSION}`;

// Assets to pre-cache on install (app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
];

// ─── INSTALL — pre-cache app shell ────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing FinPath Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      // Use addAll with individual error handling so one missing file doesn't block
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn(`[SW] Failed to cache ${url}:`, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE — clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating FinPath Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('finpath-') && ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(name))
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── FETCH — smart caching strategy ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'api.anthropic.com') return; // Never cache AI API calls

  // Google Fonts — cache first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // API calls to external services — network first with dynamic cache fallback
  if (url.hostname !== self.location.hostname && url.protocol === 'https:') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // HTML navigation — network first (always get latest app)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Static assets (JS, CSS, images) — stale while revalidate
  if (url.pathname.startsWith('/static/') || url.pathname.includes('.chunk.')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Everything else — cache first with network fallback
  event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
});

// ─── CACHING STRATEGIES ───────────────────────────────────────────────────────

// Cache First: serve from cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network First: try network, fallback to cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Network First with offline HTML fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request) || await cache.match('/index.html');
    return cached || await caches.match('/offline.html') || new Response('<h1>You are offline</h1><p>Please reconnect to continue using FinPath.</p>', { headers: { 'Content-Type': 'text/html' } });
  }
}

// Stale While Revalidate: serve from cache immediately, update cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || networkFetch;
}

// ─── BACKGROUND SYNC ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'finpath-sync-investments') {
    event.waitUntil(syncInvestmentData());
  }
  if (event.tag === 'finpath-sync-profile') {
    event.waitUntil(syncProfileData());
  }
});

async function syncInvestmentData() {
  console.log('[SW] Background sync: investment data');
  // When you connect to a real backend, this will sync cached investment updates
  // For now just logs — replace with your API call when backend is ready
}

async function syncProfileData() {
  console.log('[SW] Background sync: profile data');
  // When you connect to a real backend, sync profile changes made offline
}

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  let data = { title: 'FinPath Nigeria', body: 'You have a new update!', icon: '/icons/icon-192x192.png', badge: '/icons/icon-72x72.png', tag: 'finpath-update', url: '/' };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: { url: data.url },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open FinPath', icon: '/icons/icon-72x72.png' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) clients.openWindow(url);
    })
  );
});

// ─── MESSAGE HANDLER (from app) ───────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(names => names.forEach(name => caches.delete(name)));
    event.ports[0]?.postMessage({ ok: true });
  }
});
