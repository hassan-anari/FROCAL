import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const srcRoot = path.join(root, "src");
const ignoredFiles = new Set([
  path.normalize("src/design-system/components/DevScenarioPanel.module.css"),
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  }));
  return nested.flat();
}

const files = (await walk(srcRoot)).filter((file) => /\.(tsx?|css)$/.test(file));
const failures = [];

for (const file of files) {
  const relative = path.normalize(path.relative(root, file));
  if (ignoredFiles.has(relative)) continue;
  const source = await readFile(file, "utf8");

  if (/filter:\s*["']blur\(/.test(source)) failures.push(`${relative}: animated blur is not allowed`);
  if (/height:\s*["']auto["']/.test(source)) failures.push(`${relative}: animated height:auto is not allowed`);
  if (/backdrop-filter\s*:/.test(source)) failures.push(`${relative}: live backdrop-filter is not allowed in product UI`);
  if (/will-change\s*:[^;]*filter/.test(source)) failures.push(`${relative}: will-change must not include filter`);
}

if (failures.length > 0) {
  console.error(`Mobile motion validation failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log(`Mobile motion validation passed: ${files.length} source files checked.`);
