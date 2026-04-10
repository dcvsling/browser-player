import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  base: "./",
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
        main: resolve(__dirname, "index.html"),
        auth: resolve(__dirname, "auth/index.html"),
        notFound: resolve(__dirname, "404.html"),
      },
    },
  },
});

