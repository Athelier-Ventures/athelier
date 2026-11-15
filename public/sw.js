/* Athelier PWA offline shell. No Firebase or customer data is cached. */
const CACHE = "athelier-shell-v0.1.0";
const SHELL = ["/", "/manifest.webmanifest", "/app-icon.svg", "/bienvenida-horizontal.svg", "/bienvenida-vertical.svg", "/welcome-horizontal.svg", "/welcome-vertical.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("athelier-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put("/", copy));
        }
        return response;
      }).catch(async () => (await caches.match("/")) || Response.error())
    );
    return;
  }

  const url = new URL(request.url);
  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icon-") || url.pathname === "/apple-icon" || url.pathname === "/athelier-hero.webp" || url.pathname.endsWith(".svg")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok && (response.type === "basic" || response.type === "cors")) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
