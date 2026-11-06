/* Andrzej Sowa · Planer – service worker (© Wojciech Wieczorek).
   Zawsze najpierw sieć (bez pamięci HTTP), pamięć podręczna tylko offline. Stare wersje są kasowane. */
const VERSION = 'v8-1.7';
const CACHE = `sowa-planer-${VERSION}`;
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try { const res = await fetch(req, { cache: 'no-store' }); if (res.ok) c.put(req, res.clone()).catch(() => { }); return res; }
    catch (_) { return (await c.match(req)) || (await c.match(req, { ignoreSearch: true })) || (await c.match('./')) || Response.error(); }
  })());
});
