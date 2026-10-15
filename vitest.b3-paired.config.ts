import { defineConfig } from "vitest/config";
import base from "./vitest.paired.config";
export default defineConfig({ ...base, test: { ...base.test,
  include: ["scripts/contracts/*.paired.test.ts", "scripts/contracts/b3/*.paired.test.ts"],
} });
