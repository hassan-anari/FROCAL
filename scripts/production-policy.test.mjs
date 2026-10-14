import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { validateProductionEnvironment } from "./production-policy.mjs";

for (const source of ["local", "msw", "typo"]) {
  test(`rejects ${source} data in release builds`, () => {
    assert.throws(() => validateProductionEnvironment({ VITE_DATA_SOURCE: source }), /Production requires/);
  });
}

test("Vite validates unsafe values loaded from an env file", () => {
  mkdirSync("work", { recursive: true });
  const directory = mkdtempSync(resolve("work/production-env-"));
  try {
    writeFileSync(`${directory}/.env.test-fixtures`, "VITE_DATA_SOURCE=local\n");
    const environment = { ...process.env, NODE_ENV: "production", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" };
    delete environment.VITE_DATA_SOURCE;
    const result = spawnSync(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "build", "--config", resolve("vite.config.ts"), "--mode", "test-fixtures"], {
      cwd: directory, env: environment, encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production requires/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
for (const flag of ["VITE_ENABLE_DEV_PANEL", "VITE_ENABLE_ARENA_DEBUG"]) {
  test(`rejects ${flag} in release builds`, () => {
    assert.throws(() => validateProductionEnvironment({ [flag]: "true" }), /Production forbids/);
  });
}
test("accepts remote with debug flags disabled", () => {
  validateProductionEnvironment({ VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false" });
  validateProductionEnvironment({});
});

// Exercise Vite's actual config loading: --mode cannot turn a build into a fixture exception.
for (const overrides of [
  { VITE_DATA_SOURCE: "local" }, { VITE_DATA_SOURCE: "msw" },
  { VITE_ENABLE_DEV_PANEL: "true" }, { VITE_ENABLE_ARENA_DEBUG: "true" },
  { NODE_ENV: "development" },
]) {
  test(`Vite build fails closed for ${JSON.stringify(overrides)}`, () => {
    const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build", "--mode", "test-fixtures"], {
      env: { ...process.env, NODE_ENV: "production", VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false", ...overrides },
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production requires|Production forbids|Vite builds require/);
  });
}
