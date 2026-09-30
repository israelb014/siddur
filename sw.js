// Offline cache. Bump VERSION whenever any shipped file changes.
const VERSION = 'siddur-v2';
const CORE = [
  './', './index.html', './privacy.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './fonts/frank-ruhl-libre-hebrew.woff2', './fonts/frank-ruhl-libre-latin.woff2',
  './fonts/assistant-hebrew.woff2', './fonts/assistant-latin.woff2',
  './fonts/OFL-FrankRuhlLibre.txt', './fonts/OFL-Assistant.txt'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // the app never talks to other hosts
  // pages: network first so updates arrive, cache as fallback offline (query string ignored)
  if (req.mode === 'navigate') {
    const page = new Request(url.origin + url.pathname);
    e.respondWith(fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(page, copy)); }
      return r;
    }).catch(() => caches.match(page).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  // everything else (icons, fonts): cache first, then network
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
