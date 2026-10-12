import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 仅用于把 dev/ssr-check.tsx 打包成可用 node 运行的渲染检查脚本
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dev/ssr-dist",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: "dev/ssr-check.tsx",
      formats: ["es"],
      fileName: () => "ssr-check.mjs",
    },
  },
});
