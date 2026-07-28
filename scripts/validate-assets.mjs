import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "src/assets/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const required = manifest.assets.filter((asset) => asset.requiredInPhase <= 4);
const invalid = required.filter((asset) => !asset.key || !asset.path || !asset.alt || !asset.category);

if (invalid.length > 0) {
  console.error("Invalid Phase 0/1/2/3/4 asset records:\n" + invalid.map((asset) => asset.key ?? "unknown").join("\n"));
  process.exit(1);
}

const duplicateKeys = required.filter((asset, index) => required.findIndex((entry) => entry.key === asset.key) !== index);
if (duplicateKeys.length > 0) {
  console.error("Duplicate asset keys:\n" + duplicateKeys.map((asset) => asset.key).join("\n"));
  process.exit(1);
}

const bundledPhase4 = required.filter((asset) => asset.requiredInPhase === 4 && asset.path.startsWith("/assets/profile/"));
const missingBundled = [];
for (const asset of bundledPhase4) {
  try {
    await access(path.join(root, "public", asset.path.replace(/^\//, "")), constants.R_OK);
  } catch {
    missingBundled.push(asset.path);
  }
}
if (missingBundled.length > 0) {
  console.error("Missing bundled Phase 4 assets:\n" + missingBundled.join("\n"));
  process.exit(1);
}

const fallbackPath = path.join(root, "public/assets/system/missing-asset.svg");
try {
  await access(fallbackPath, constants.R_OK);
} catch {
  console.error("Missing system fallback asset: /assets/system/missing-asset.svg");
  process.exit(1);
}

console.log(`Asset manifest validation passed: ${required.length} Phase 0/1/2/3/4 keys declared.`);
console.log("Core brand, world and Dexo artwork remain repository-maintained; Phase 4 profile assets are bundled from the approved profile pack.");
