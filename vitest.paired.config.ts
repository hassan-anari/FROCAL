import { defineConfig } from "vitest/config";
import base from "./vitest.config";
export default defineConfig({ ...base, test: { ...base.test,
  include: ["scripts/contracts/*.paired.test.ts"], fileParallelism: false,
  environment: "node", setupFiles: [],
} });
