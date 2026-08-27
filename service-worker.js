/**
 * App-shell cache-first service worker. Everything the calculator needs
 * (markup, styles, scripts, fonts, images, the PDF library) is cached
 * on install so the app keeps working with no connection after the
 * first load. Bump CACHE_NAME whenever a cached file's content changes
 * so clients pick up the new version instead of stale cache.
 */
const CACHE_NAME = "nurzaman-calculator-v11";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/config.js",
  "./js/currency.js",
  "./js/format.js",
  "./js/calculator.js",
  "./js/genplan.js",
  "./js/floorplans.js",
  "./js/pdf.js",
  "./js/app.js",
  "./js/vendor/jspdf.umd.min.js",
  "./js/vendor/roboto-regular-font.js",
  "./js/vendor/roboto-bold-font.js",
  "./assets/logo.png",
  "./assets/render.jpg",
  "./assets/genplan.jpg",
  "./assets/location-map.jpg",
  "./assets/floorplans/38.34-studio.jpg",
  "./assets/floorplans/38.34-euro.jpg",
  "./assets/floorplans/40.22-euro.jpg",
  "./assets/floorplans/58.37.jpg",
  "./assets/floorplans/59.03.jpg",
  "./assets/floorplans/63.jpg",
  "./assets/floorplans/63.74-euro.jpg",
  "./assets/floorplans/80.39.jpg",
  "./assets/floorplans/90.01.jpg",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-192-maskable.png",
  "./assets/icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
