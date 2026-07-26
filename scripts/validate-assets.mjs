import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "src/assets/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const required = manifest.assets.filter((asset) => asset.requiredInPhase <= 2);
const invalid = required.filter((asset) => !asset.key || !asset.path || !asset.alt || !asset.category);

if (invalid.length > 0) {
  console.error("Invalid Phase 0/1/2 asset records:\n" + invalid.map((asset) => asset.key ?? "unknown").join("\n"));
  process.exit(1);
}

const fallbackPath = path.join(root, "public/assets/system/missing-asset.svg");
try {
  await access(fallbackPath, constants.R_OK);
} catch {
  console.error("Missing system fallback asset: /assets/system/missing-asset.svg");
  process.exit(1);
}

console.log(`Asset manifest validation passed: ${required.length} Phase 0/1/2 keys declared.`);
console.log("Brand, world, and Dexo artwork are repository-maintained and intentionally excluded from checkpoint ZIPs.");
