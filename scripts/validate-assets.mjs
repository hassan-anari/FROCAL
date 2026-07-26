import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const manifestPath = path.join(root, "src/assets/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const required = manifest.assets.filter((asset) => asset.requiredInPhase <= 1);
const repositoryMaintained = new Set([
  "brand.logo",
  "brand.logoTagline",
  "world.foundationBackdrop",
]);
const missing = [];

for (const asset of required) {
  if (repositoryMaintained.has(asset.key)) continue;
  const diskPath = path.join(root, "public", asset.path.replace(/^\//, ""));
  try {
    await access(diskPath, constants.R_OK);
  } catch {
    missing.push(`${asset.key} -> ${asset.path}`);
  }
}

if (missing.length > 0) {
  console.error("Missing required Phase 1 assets:\n" + missing.join("\n"));
  process.exit(1);
}

console.log(`Asset validation passed: ${required.length} Phase 0/1 keys declared.`);
console.log("Brand logos and the approved foundation background are repository-maintained and intentionally excluded from checkpoint ZIPs.");
