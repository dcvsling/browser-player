// These two values are replaced after Vite writes the production build.
// The unbuilt development worker deliberately does not cache source modules.
const UI_BUILD_VERSION = "__BPAI_UI_BUILD_VERSION__";
const PRECACHE_ASSETS = /* __BPAI_UI_PRECACHE__ */ [];
const SCOPE = self.registration.scope;
// Hex keeps deployment paths out of cache names: legacy startup cleanup can
// otherwise mistake a path containing "browser-player" for an old data cache.
const SCOPE_CACHE_KEY = Array.from(new TextEncoder().encode(SCOPE), (byte) => byte.toString(16).padStart(2, "0")).join("");
const UI_CACHE_PREFIX = `bpai-ui:${SCOPE_CACHE_KEY}:`;
const STATIC_CACHE = `${UI_CACHE_PREFIX}static:${UI_BUILD_VERSION}`;
const PAGE_CACHE = `${UI_CACHE_PREFIX}pages:${UI_BUILD_VERSION}`;
const PRECACHE_URLS = new Set(PRECACHE_ASSETS.map((path) => new URL(path, SCOPE).href));
const PAGE_PATHS = new Set([
  "", "index.html", "player", "playlist", "schedule", "settings",
  "auth", "auth/", "auth/index.html", "404.html",
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Bypass the HTTP cache so a stable public URL (HTML, manifest, icon)
      // cannot bring stale bytes into this build's new UI cache.
      await cache.addAll([...PRECACHE_URLS].map((url) => new Request(url, { cache: "reload" })));
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) =>
            (key.startsWith(`${UI_CACHE_PREFIX}static:`) || key.startsWith(`${UI_CACHE_PREFIX}pages:`)) &&
            ![STATIC_CACHE, PAGE_CACHE].includes(key)
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;

  const relativePath = url.pathname.slice(new URL(SCOPE).pathname.length);
  if (request.mode === "navigate" && PAGE_PATHS.has(relativePath)) {
    event.respondWith(networkFirstPage(request, relativePath));
    return;
  }

  // Cache only files shipped with this UI. Media, thumbnails, API responses,
  // and other applications' caches are outside the update lifecycle.
  if (PRECACHE_URLS.has(url.href)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

async function networkFirstPage(request, relativePath) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request, { cache: "no-cache" });
    // In particular, never persist OAuth callback codes from query strings.
    if (response.ok && !new URL(request.url).search && response.headers.get("content-type")?.includes("text/html")) {
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    if (relativePath === "auth") {
      // The callback HTML uses ../assets URLs, which need the auth/ directory.
      const requestedUrl = new URL(request.url);
      const callbackUrl = new URL("auth/index.html", SCOPE);
      callbackUrl.search = requestedUrl.search;
      callbackUrl.hash = requestedUrl.hash;
      return Response.redirect(callbackUrl.href, 302);
    }
    const fallbackPath = relativePath === "auth" || relativePath.startsWith("auth/")
      ? "auth/index.html"
      : relativePath === "404.html" ? "404.html" : "index.html";
    const staticCache = await caches.open(STATIC_CACHE);
    return (
      (await cache.match(request)) ||
      (await staticCache.match(new URL(fallbackPath, SCOPE).href)) ||
      Response.error()
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch {
    return Response.error();
  }
}
