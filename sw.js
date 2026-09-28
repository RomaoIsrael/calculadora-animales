/* Service worker: guarda la app para que funcione sin conexión. */
const CACHE = "es-buen-negocio-v4";
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
    Promise.all(ARCHIVOS.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {})))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Archivos de la app: primero internet (siempre la versión más nueva);
  // sin conexión, la copia guardada.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.open(CACHE).then(async c => {
      try {
        const r = await fetch(req, { cache: "no-cache" });
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (err) {
        const guardado = await c.match(req, { ignoreSearch: true });
        if (guardado) return guardado;
        if (req.mode === "navigate") return (await c.match("./index.html")) || (await c.match("./")) || Response.error();
        return Response.error();
      }
    }));
    return;
  }

  // Librería de gráficos (versión fija): primero la copia guardada.
  e.respondWith(caches.open(CACHE).then(async c => {
    const guardado = await c.match(req);
    if (guardado) return guardado;
    const r = await fetch(req);
    if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone());
    return r;
  }));
});
