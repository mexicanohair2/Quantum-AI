// Quantum-AI no longer needs offline caching or a service worker.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith("quantum-ai-shell-"))
      .map((key) => caches.delete(key)));
    await self.registration.unregister();
    await self.clients.claim();
  })());
});

// Do not intercept requests or cache any application files.
