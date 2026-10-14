import { readdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const root = process.argv[2] ?? "dist";
const forbidden = ["DiagnosticsPage", "DevScenarioPanel", "ArenaDebugPanel", "b2BrowserHarness", "testing.fixture", "/mocks/"];
let maps = 0;
for (const file of await readdir(`${root}/assets`)) {
  if (!file.endsWith(".js.map")) continue;
  maps++;
  const map = JSON.parse(await readFile(`${root}/assets/${file}`, "utf8"));
  for (const source of map.sources) {
    assert(!forbidden.some((name) => source.includes(name)), `Debug/mock module shipped: ${source}`);
  }
}
assert(maps > 0, "Expected build source maps for module exclusion evidence");
console.log(`Production module exclusion passed (${maps} source maps).`);
