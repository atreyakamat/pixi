/*
 * Pixi's offline worker (web build only; the Android app is offline by nature).
 *
 * Nothing here talks to another host. Pages are fetched fresh when there is a connection and
 * served from the cache when there is not; the hashed files under /_next/static never change,
 * so they are served from the cache first. On install the worker reads each page and stores
 * every script and style it refers to, so the app works offline from the second visit even if
 * a screen was never opened.
 */
const CACHE = "pixi-offline-v1";
const PAGES = ["/", "/app/", "/u/", "/privacy/"];
const EXTRAS = ["/manifest.webmanifest"];

const sameOrigin = (url) => new URL(url, self.location.href).origin === self.location.origin;

async function precache() {
  const cache = await caches.open(CACHE);
  const wanted = new Set(EXTRAS);
  for (const page of PAGES) {
    try {
      const res = await fetch(page, { cache: "no-cache" });
      if (!res.ok) continue;
      await cache.put(page, res.clone());
      const html = await res.text();
      for (const m of html.matchAll(/\/_next\/static\/[^"'\\\s<>)]+/g)) wanted.add(m[0]);
      for (const m of html.matchAll(/(?:href|src)="(\/[^"]+\.(?:png|svg|ico|webmanifest|woff2?))"/g)) wanted.add(m[1]);
    } catch { /* offline during install: keep whatever is already cached */ }
  }
  await Promise.all([...wanted].map(async (u) => {
    try { if (!(await cache.match(u))) { const r = await fetch(u); if (r.ok) await cache.put(u, r); } } catch { /* skip */ }
  }));
  return wanted;
}

self.addEventListener("install", (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE && k.startsWith("pixi-offline")) await caches.delete(k);
    await self.clients.claim();
  })());
});

// The page tells the worker what it actually loaded (lazy chunks included) and which hashed files
// are current, so old builds' files can be dropped.
self.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || d.type !== "pixi-loaded" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const urls = d.urls.filter((u) => typeof u === "string" && sameOrigin(u)).slice(0, 400).map((u) => new URL(u, self.location.href).pathname);
    await Promise.all(urls.map(async (u) => { try { if (!(await cache.match(u))) { const r = await fetch(u); if (r.ok) await cache.put(u, r); } } catch { /* skip */ } }));
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || !sameOrigin(req.url)) return;
  const url = new URL(req.url);
  if (url.pathname === "/sw.js") return;

  // Hashed build files: cache first, they are immutable.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(url.pathname);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(url.pathname, res.clone());
      return res;
    })());
    return;
  }

  // Pages and everything else: network first so updates arrive, cache when offline.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === "navigate" ? url.pathname : req;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === "basic") cache.put(key, res.clone());
      return res;
    } catch {
      const hit = (await cache.match(key)) ?? (req.mode === "navigate" ? (await cache.match(url.pathname.endsWith("/") ? url.pathname : url.pathname + "/")) : undefined);
      if (hit) return hit;
      return new Response("Pixi is offline and this page was not saved yet. Open it once with a connection.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});
