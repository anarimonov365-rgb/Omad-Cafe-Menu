const CACHE = "menyu-v3";
const EXT = "(?:jpe?g|png|webp|gif|svg|avif)";

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const res = await fetch("/");
      await cache.put("/", res.clone());
      const html = await res.text();

      const found = new Set();
      const patterns = [
        new RegExp('"([^"]+?\\.' + EXT + ')"', "gi"),
        new RegExp("'((?:[^'\\\\]|\\\\.)+?\\.' + EXT + ')'", "gi"),
        new RegExp("`([^`]+?\\." + EXT + ")`", "gi"),
      ];
      for (const re of patterns) {
        let m;
        while ((m = re.exec(html))) {
          const u = m[1].replace(/\\'/g, "'").trim();
          if (u.length < 200 && !/[\n<>]/.test(u) && !u.startsWith("data:") && !u.startsWith("http")) {
            found.add(u);
          }
        }
      }

      await Promise.all(
        [...found].map(async (u) => {
          try {
            const req = new Request(new URL(u, self.location.origin + "/").href);
            const r = await fetch(req);
            if (r.ok) await cache.put(req, r);
          } catch (err) {}
        })
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
