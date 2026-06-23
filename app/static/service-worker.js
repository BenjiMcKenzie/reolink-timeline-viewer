const CACHE_NAME = "reolink-timeline-viewer-static-v1.0.0";
const APP_SCOPE = "/reolink/";
const URLS_TO_CACHE = [
  "/reolink/",
  "/reolink/static/styles.css?v=1.0.0",
  "/reolink/static/app.js?v=1.0.0",
  "/reolink/manifest.webmanifest",
  "/reolink/static/icons/icon-192.png",
  "/reolink/static/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => key !== CACHE_NAME ? caches.delete(key) : undefined)))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (!requestUrl.pathname.startsWith(APP_SCOPE)) return;
  if (event.request.method !== "GET") return;

  if (requestUrl.pathname.includes("/api/") || requestUrl.pathname.includes("/media/")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request))
  );
});
