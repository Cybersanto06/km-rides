/* KM Rides - PASSENGER service worker.
   Keep VERSION identical to APP_VERSION in index.html and bump both for every release. */
const VERSION = '1.0.0';
const CACHE = 'kmr-passenger-' + VERSION;
const BASE = new URL('./', self.location).pathname;           // "/" on the live site
const INDEX = new URL('index.html', self.location).href;
const OFFLINE = new URL('offline.html', self.location).href;

// The app's own files (must all download for the install to succeed)
const SHELL = [
  'index.html', 'offline.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];
// Versioned libraries the page needs to start (saved on a best-effort basis)
const LIBS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    await Promise.all(LIBS.map(async u => {
      try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await cache.put(u, r); } catch (e) { /* offline during install: fine */ }
    }));
    // No skipWaiting here: a new version waits until the passenger taps "Update", so a ride is never interrupted.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('kmr-passenger-') && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function cacheFirst(req) {
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && new URL(req.url).origin === self.location.origin) {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
  }
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreVary: true });
  const net = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => hit);
  return hit || net;
}

async function navigate(req) {
  try {
    const res = await fetch(req);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(INDEX, copy)).catch(() => {});
    }
    return res;
  } catch (e) {
    return (await caches.match(INDEX, { ignoreVary: true })) || (await caches.match(OFFLINE, { ignoreVary: true })) ||
      new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // never touch the driver app or Firebase's reserved paths
    if (url.pathname === BASE + 'driver' || url.pathname.startsWith(BASE + 'driver/') || url.pathname.startsWith('/__/')) return;
    if (req.mode === 'navigate') { event.respondWith(navigate(req)); return; }
    event.respondWith(cacheFirst(req));
    return;
  }

  if (LIBS.includes(req.url)) { event.respondWith(cacheFirst(req)); return; }
  if (url.hostname === 'fonts.googleapis.com') { event.respondWith(staleWhileRevalidate(req)); return; }
  if (url.hostname === 'fonts.gstatic.com') { event.respondWith(cacheFirst(req)); return; }
  // everything else (database, map tiles, place search, sign-in) goes straight to the network
});
