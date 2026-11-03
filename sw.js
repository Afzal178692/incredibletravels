const CACHE_NAME = "incredible-travels-v38";
const APP_SHELL = [
  new URL("./", self.location).href,
  new URL("./index.html", self.location).href,
  new URL("./manifest.webmanifest", self.location).href,
  new URL("./app-icon.svg", self.location).href,
  new URL("./app-icon-512.png", self.location).href
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(new Request(request, { cache: "no-store" }));
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) ||
          (await caches.match(new URL("./index.html", self.registration.scope).href)) ||
          Response.error();
      }
    })());
    return;
  }

  if (["script", "style", "image", "font"].includes(request.destination) ||
      url.pathname.endsWith(".webmanifest")) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const network = fetch(new Request(request, { cache: "no-store" })).then(async response => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);

      return cached || await network || Response.error();
    })());
  }
});