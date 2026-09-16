import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
    cssCodeSplit: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api/v1": {
        target: "https://api.dalexio.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
