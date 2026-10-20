import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL(".", import.meta.url));

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      return listFiles(resolve(directory, entry.name), `${relativePath}/`);
    }
    return entry.isFile() ? [relativePath] : [];
  }));
  return files.flat().sort();
}

export function uiServiceWorkerPlugin() {
  let config;
  return {
    name: "browser-player-ui-service-worker",
    apply: "build",
    enforce: "post",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    // Vite copies public/ before writing the bundle. Generate the final worker
    // afterward, so public/sw.js cannot overwrite its version or asset list.
    async writeBundle(outputOptions) {
      const outDir = resolve(config.root, outputOptions.dir || config.build.outDir);
      const template = await readFile(resolve(config.publicDir, "sw.js"), "utf8");
      const files = (await listFiles(outDir)).filter((file) => file !== "sw.js" && !file.endsWith(".map"));
      const hash = createHash("sha256").update(template);
      for (const file of files) {
        const contents = await readFile(resolve(outDir, file));
        hash.update(`\0${file}\0${contents.length}\0`).update(contents);
      }
      const version = hash.digest("hex").slice(0, 24);
      const assetUrls = files.map((file) => file.split("/").map(encodeURIComponent).join("/"));
      const versionMarker = '"__BPAI_UI_BUILD_VERSION__"';
      const assetsMarker = "/* __BPAI_UI_PRECACHE__ */ []";
      if (!template.includes(versionMarker) || !template.includes(assetsMarker)) {
        throw new Error("Service worker build markers are missing from public/sw.js");
      }
      await writeFile(resolve(outDir, "sw.js"), template
        .replace(versionMarker, JSON.stringify(version))
        .replace(assetsMarker, JSON.stringify(assetUrls, null, 2)));
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [uiServiceWorkerPlugin()],
  server: {
    host: "localhost",
    port: 4200,
  },
  preview: {
    host: "localhost",
    port: 4200,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(projectDir, "index.html"),
        auth: resolve(projectDir, "auth/index.html"),
        notFound: resolve(projectDir, "404.html"),
      },
    },
  },
});

