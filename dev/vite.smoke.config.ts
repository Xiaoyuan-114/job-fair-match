import { defineConfig } from "vite";

// 仅用于把 dev/smoke.ts 打包成可直接用 node 跑的脚本（不进 dist，不参与发布）
export default defineConfig({
  build: {
    outDir: "dev/smoke-dist",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: "dev/smoke.ts",
      formats: ["es"],
      fileName: () => "smoke.mjs",
    },
    rollupOptions: { external: [] },
  },
});
