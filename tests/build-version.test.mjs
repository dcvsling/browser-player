import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { build } from "vite";
import { uiServiceWorkerPlugin } from "../vite.config.js";

const projectDir = fileURLToPath(new URL("..", import.meta.url));
const scopeCacheKey = (scope) => Buffer.from(scope).toString("hex");

async function createFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "browser-player-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "public", "icons"), { recursive: true });
  await mkdir(join(root, "auth"));
  await Promise.all([
    copyFile(join(projectDir, "public", "sw.js"), join(root, "public", "sw.js")),
    writeFile(join(root, "public", "manifest.webmanifest"), '{"name":"Test player"}'),
    writeFile(join(root, "public", "icons", "test icon.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>'),
    writeFile(join(root, "index.html"), '<!doctype html><link rel="stylesheet" href="./styles.css"><script type="module" src="./main.js"></script><body>Build one</body>'),
    writeFile(join(root, "auth", "index.html"), "<!doctype html><body>Auth callback</body>"),
    writeFile(join(root, "404.html"), "<!doctype html><body>Routing fallback</body>"),
    writeFile(join(root, "styles.css"), "body { color: red; }"),
    writeFile(join(root, "main.js"), 'document.body.dataset.version = "one";'),
  ]);
  return root;
}

async function buildFixture(root) {
  await build({
    root,
    configFile: false,
    base: "./",
    logLevel: "silent",
    plugins: [uiServiceWorkerPlugin()],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: resolve(root, "index.html"),
          auth: resolve(root, "auth/index.html"),
          notFound: resolve(root, "404.html"),
        },
      },
    },
  });
  const source = await readFile(join(root, "dist", "sw.js"), "utf8");
  const version = JSON.parse(source.match(/const UI_BUILD_VERSION = ("[^"]+");/)[1]);
  const assets = JSON.parse(source.match(/const PRECACHE_ASSETS = (\[[\s\S]*?\]);/)[1]);
  return { source, version, assets };
}

function workerHarness(source, { scope = "https://player.test/browser-player/", fetchImpl } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const deleted = [];
  const installedRequests = [];
  let skipWaitingCalls = 0;
  let claimCalls = 0;
  const keyOf = (request) => typeof request === "string" ? request : request.url;
  const caches = {
    async open(name) {
      if (!stores.has(name)) {
        const entries = new Map();
        stores.set(name, {
          entries,
          async addAll(requests) {
            for (const request of requests) {
              installedRequests.push(request);
              entries.set(request.url, new Response(`cached:${request.url}`));
            }
          },
          async match(request) { return entries.get(keyOf(request))?.clone(); },
          async put(request, response) { entries.set(keyOf(request), response); },
        });
      }
      return stores.get(name);
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); },
  };
  runInNewContext(source, {
    URL, Request, Response, TextEncoder, caches,
    fetch: fetchImpl || (async () => { throw new Error("offline"); }),
    self: {
      registration: { scope },
      location: new URL(scope),
      addEventListener(type, listener) { listeners.set(type, listener); },
      async skipWaiting() { skipWaitingCalls += 1; },
      clients: { async claim() { claimCalls += 1; } },
    },
    get localStorage() { throw new Error("UI update must not touch localStorage"); },
    get indexedDB() { throw new Error("UI update must not touch IndexedDB"); },
  });
  return {
    scope, caches, stores, deleted, installedRequests,
    get skipWaitingCalls() { return skipWaitingCalls; },
    get claimCalls() { return claimCalls; },
    async lifecycle(type) {
      let done;
      listeners.get(type)({ waitUntil(promise) { done = promise; } });
      await done;
    },
    message(data) { listeners.get("message")({ data }); },
    request(path, options = {}) {
      let response;
      listeners.get("fetch")({
        request: { url: new URL(path, scope).href, method: "GET", mode: "cors", destination: "", ...options },
        respondWith(promise) { response = promise; },
      });
      return response;
    },
  };
}

test("production worker fingerprints emitted UI and overwrites the copied public worker", async (t) => {
  const root = await createFixture(t);
  let previous = await buildFixture(root);
  assert.match(previous.version, /^[a-f0-9]{24}$/);
  assert.ok(!previous.source.includes("__BPAI_UI_BUILD_VERSION__"));
  assert.ok(!previous.source.includes("__BPAI_UI_PRECACHE__"));
  assert.ok(previous.assets.some((path) => /^assets\/.*\.css$/.test(path)));
  assert.ok(previous.assets.some((path) => /^assets\/.*\.js$/.test(path)));
  assert.ok(previous.assets.includes("auth/index.html"));
  assert.ok(previous.assets.includes("icons/test%20icon.svg"));
  assert.ok(!previous.assets.includes("styles.css"));
  assert.ok(!previous.assets.includes("sw.js"));
  for (const asset of previous.assets) {
    assert.ok(!asset.startsWith("/") && !asset.includes("://"));
    await readFile(join(root, "dist", decodeURIComponent(asset)));
  }
  assert.equal((await buildFixture(root)).source, previous.source, "identical UI must produce identical worker bytes");

  for (const [path, content] of [
    ["main.js", 'document.body.dataset.version = "two";'],
    ["styles.css", "body { color: blue; }"],
    ["index.html", '<!doctype html><link rel="stylesheet" href="./styles.css"><script type="module" src="./main.js"></script><body>Build two</body>'],
    ["public/manifest.webmanifest", '{"name":"Updated player"}'],
    ["public/icons/test icon.svg", '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>'],
    ["public/sw.js", `${await readFile(join(root, "public", "sw.js"), "utf8")}\n// Worker behavior revision\n`],
  ]) {
    await writeFile(join(root, path), content);
    const next = await buildFixture(root);
    assert.notEqual(next.version, previous.version, `${path} changes must invalidate the UI cache version`);
    assert.notEqual(next.source, previous.source);
    previous = next;
  }
});

test("worker precaches real subpath URLs, waits for consent, and deletes only its own old UI caches", async (t) => {
  const root = await createFixture(t);
  const output = await buildFixture(root);
  const worker = workerHarness(output.source);
  const prefix = `bpai-ui:${scopeCacheKey(worker.scope)}:`;
  for (const legacyPattern of ["browser-player", "workbox", "precache", "vite-pwa", "sw-cache"]) {
    assert.ok(!prefix.includes(legacyPattern), "the scope must not trigger app legacy cleanup");
  }
  const protectedNames = [
    `${prefix}static:${output.version}`,
    `${prefix}pages:${output.version}`,
    `${prefix}media:user-library`,
    `bpai-ui:${scopeCacheKey("https://player.test/another-app/")}:static:old`,
    "browser-player-ai-media",
    "browser-player-ai-thumbnails",
    "unrelated-application",
    "bpai-static-v1",
    "bpai-page-v1",
  ];
  for (const name of [...protectedNames, `${prefix}static:old`, `${prefix}pages:old`]) {
    await worker.caches.open(name);
  }
  await worker.lifecycle("install");
  assert.equal(worker.skipWaitingCalls, 0);
  assert.deepEqual(worker.installedRequests.map((request) => request.url), output.assets.map((asset) => new URL(asset, worker.scope).href));
  assert.ok(worker.installedRequests.every((request) => request.cache === "reload"));
  worker.message({ type: "UNRELATED" });
  assert.equal(worker.skipWaitingCalls, 0);
  worker.message({ type: "SKIP_WAITING" });
  assert.equal(worker.skipWaitingCalls, 1);
  await worker.lifecycle("activate");
  assert.deepEqual(worker.deleted.sort(), [`${prefix}pages:old`, `${prefix}static:old`].sort());
  assert.equal(worker.claimCalls, 1);
  for (const name of protectedNames) assert.ok(worker.stores.has(name), `${name} must survive activation`);
});

test("worker serves cached built UI offline without intercepting user media or other applications", async (t) => {
  const root = await createFixture(t);
  const output = await buildFixture(root);
  const worker = workerHarness(output.source);
  await worker.lifecycle("install");
  const css = output.assets.find((asset) => asset.endsWith(".css"));
  assert.equal(await (await worker.request(css, { destination: "style" })).text(), `cached:${new URL(css, worker.scope).href}`);
  for (const path of ["player", "playlist", "schedule", "settings"]) {
    const page = await worker.request(path, { mode: "navigate" });
    assert.equal(await page.text(), `cached:${worker.scope}index.html`);
  }
  const authRedirect = await worker.request("auth?code=private#callback", { mode: "navigate" });
  assert.equal(authRedirect.status, 302);
  assert.equal(authRedirect.headers.get("location"), `${worker.scope}auth/index.html?code=private#callback`);
  assert.equal(await (await worker.request("auth/index.html?code=private", { mode: "navigate" })).text(), `cached:${worker.scope}auth/index.html`);
  assert.equal(worker.request("media/local.mp4", { destination: "video" }), undefined);
  assert.equal(worker.request("thumbnails/user.jpg", { destination: "image" }), undefined);
  assert.equal(worker.request("media/local.mp4", { mode: "navigate" }), undefined);
  assert.equal(worker.request("/another-app/index.html", { mode: "navigate" }), undefined);
  assert.equal(worker.request("https://cdn.example.test/script.js", { destination: "script" }), undefined);
  assert.equal(worker.request(css, { method: "POST" }), undefined);
  const staticStore = [...worker.stores.entries()].find(([name]) => name.includes(":static:"))[1];
  staticStore.entries.clear();
  assert.equal((await worker.request(css, { destination: "style" })).type, "error");
});

test("network pages revalidate and OAuth callback query strings never enter page cache", async (t) => {
  const root = await createFixture(t);
  const output = await buildFixture(root);
  const requests = [];
  const worker = workerHarness(output.source, {
    fetchImpl: async (request, options) => {
      requests.push({ request, options });
      return new Response("current HTML", { headers: { "content-type": "text/html; charset=utf-8" } });
    },
  });
  await worker.request("player", { mode: "navigate" });
  await worker.request("auth?code=private", { mode: "navigate" });
  assert.ok(requests.every(({ options }) => options.cache === "no-cache"));
  const pageStore = [...worker.stores.entries()].find(([name]) => name.includes(":pages:"))[1];
  assert.deepEqual([...pageStore.entries.keys()], [`${worker.scope}player`]);
});
