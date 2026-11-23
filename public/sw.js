/* Athelier PWA: public static shell only; no private or purchase data cached. */
const CACHE = "athelier-shell-v0.6.0";
const SHELL = [
  "/", "/manifest.webmanifest", "/app-icon.svg", "/athelier-hero.svg", "/athelier-hero-en.svg",
  "/logo-athelier.svg", "/bienvenida-horizontal.svg", "/bienvenida-vertical.svg",
  "/welcome-horizontal.svg", "/welcome-vertical.svg"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith("athelier-") && key !== CACHE).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  const path = new URL(request.url).pathname;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => (await caches.match("/")) || Response.error()));
    return;
  }
  if (path.startsWith("/_next/") || path.startsWith("/icon-") ||
      path === "/apple-icon" || path.endsWith(".svg")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && response.type !== "opaque") {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })));
  }
});
