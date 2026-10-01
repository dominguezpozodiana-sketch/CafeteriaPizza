/* Service worker — bella-napoli-cliente-v2 */
const CACHE = 'bella-napoli-cliente-v2';
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/styles.css",
  "./assets/data.js",
  "./assets/pwa.js",
  "./assets/loader.js",
  "./assets/shop.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
// Opcionales: si no existen, la instalación del SW NO debe fallar
const OPTIONAL = ["./assets/vendor/supabase.js"];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    await Promise.allSettled(OPTIONAL.map(u => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Todo lo externo (Supabase, CDNs) va directo a la red: el SW nunca lo retiene ni lo cuelga
  if (url.origin !== location.origin) return;

  // Archivos propios: red primero, caché si no hay conexión
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
