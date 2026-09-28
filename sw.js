/* Service worker: guarda la app para que funcione sin conexión. */
const CACHE = "es-buen-negocio-v1";
const ARCHIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c =>
    Promise.all(ARCHIVOS.map(u => c.add(u).catch(() => {})))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

// Primero lo guardado (rápido y sin internet); en segundo plano se actualiza.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const guardado = await c.match(req, { ignoreSearch: req.mode === "navigate" });
    const red = fetch(req).then(r => {
      if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
      return r;
    }).catch(() => null);
    if (guardado) { e.waitUntil(red); return guardado; }
    const r = await red;
    if (r) return r;
    if (req.mode === "navigate") return (await c.match("./index.html")) || Response.error();
    return Response.error();
  }));
});
