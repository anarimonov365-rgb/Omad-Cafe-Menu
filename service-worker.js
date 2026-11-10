const CACHE = "menyu-v2";

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.add("/");
      // sahifadagi barcha rasmlarni topib keshlaymiz
      const res = await fetch("/");
      const html = await res.text();
      const doc = html.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi) || [];
      const urls = doc.map((s) => s.replace(/^src=["']/i, "").replace(/["']$/, ""));
      await Promise.all(
        urls.map((u) => cache.add(u).catch(() => {}))
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(e.request)
        .then((r) => {
          if (r && r.status === 200) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return r;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
