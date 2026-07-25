import { readdir, readFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const extensions = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".module.css"];

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

async function exists(candidate) {
  for (const extension of extensions) {
    try {
      await access(candidate + extension, constants.R_OK);
      return true;
    } catch {}
  }
  for (const extension of [".ts", ".tsx", ".js", ".jsx", ".json"]) {
    try {
      await access(path.join(candidate, "index" + extension), constants.R_OK);
      return true;
    } catch {}
  }
  return false;
}

const failures = [];
for (const file of await walk(srcRoot)) {
  const text = await readFile(file, "utf8");
  const importPattern = /(?:from\s+|import\s*\()(["'])([^"']+)\1/g;
  let match;
  while ((match = importPattern.exec(text))) {
    const specifier = match[2];
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) continue;
    const candidate = specifier.startsWith("@/")
      ? path.join(srcRoot, specifier.slice(2))
      : path.resolve(path.dirname(file), specifier);
    if (!(await exists(candidate))) failures.push(`${path.relative(root, file)} -> ${specifier}`);
  }
}

if (failures.length) {
  console.error("Unresolved local imports:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("Local import validation passed.");
