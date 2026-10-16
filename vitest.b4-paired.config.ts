import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["scripts/contracts/b4/*.paired.test.ts"], environment: "node", testTimeout: 20000, fileParallelism: false },
});
