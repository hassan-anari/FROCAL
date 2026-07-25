import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "src/assets/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const required = manifest.assets.filter((asset) => asset.requiredInPhase === 0);

const invalid = required.filter((asset) => !asset.key || !asset.path || !asset.alt);

if (invalid.length > 0) {
  console.error("Invalid Phase 0 asset records:\n" + invalid.map((asset) => asset.key).join("\n"));
  process.exit(1);
}

console.log(`Asset manifest validation passed: ${required.length} Phase 0 asset keys declared.`);
console.log("Note: assets are externalized and expected to exist in the main repository / deployment source.");
