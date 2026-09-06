const BASE = new URL("./", self.location).pathname;

importScripts(`${BASE}controller/controller.sw.js`);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  try {
    if (self.$scramjetController?.shouldRoute(event)) {
      event.respondWith(self.$scramjetController.route(event));
      return;
    }
  } catch {
    void 0;
  }
  const base = new URL("./", self.location).pathname;
  if (!new URL(event.request.url).pathname.startsWith(`${base}f/`)) return;
  event.respondWith(reviveRoute(event));
});

async function reviveRoute(event) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) client.postMessage({ $controller$swrevive: {} });
  for (let attempt = 0; attempt < 320; attempt += 1) {
    try {
      if (self.$scramjetController?.shouldRoute(event)) return self.$scramjetController.route(event);
    } catch {
      void 0;
    }
    await new Promise((resolve) => self.setTimeout(resolve, 25));
  }
  return new Response("Korona runtime controller was not ready.", { status: 503 });
}
