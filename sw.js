/* Andrzej Sowa · Planer – service worker (© Wojciech Wieczorek). Sieć najpierw, offline z pamięci. */
const VERSION = 'v1';
const CACHE = `sowa-planer-${VERSION}`;
const FILES = ['./', './index.html', './style.css', './manifest.webmanifest', './js/version.js', './js/data.js', './js/logic.js', './js/report.js', './js/pdf.js', './js/app.js',
  './assets/logo.svg', './assets/fonts.css', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/icon-180.png',
  './assets/vendor/jspdf.umd.min.js', './assets/vendor/jspdf.plugin.autotable.min.js', './assets/vendor/pdf-fonts.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => { })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('sowa-planer-') && k !== CACHE) await caches.delete(k); await self.clients.claim(); })()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()).catch(() => { }); return res; }
    catch (_) { return (await c.match(req, { ignoreSearch: true })) || (await c.match('./index.html')); }
  })());
});
