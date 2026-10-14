import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { validateProductionEnvironment } from "./scripts/production-policy.mjs";

export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    validateProductionEnvironment({ ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env });
    if (process.env.NODE_ENV && process.env.NODE_ENV !== "production") {
      throw new Error("Vite builds require NODE_ENV=production (or unset); use vite dev for fixtures.");
    }
  }
  return {
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
      proxy: mode === "test-fixtures" ? undefined : {
        "/api/v1": {
          target: "https://api.dalexio.com",
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
