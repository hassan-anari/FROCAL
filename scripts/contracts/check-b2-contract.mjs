import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
for (const batch of ["b2", "b3", "b4", "b5", "b6", "post-b6"]) {
const pin = JSON.parse(readFileSync(`scripts/contracts/${batch}-pin.json`, "utf8"));
for (const [file, expected] of Object.entries(pin.files)) {
  const bytes = readFileSync(file);
  const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(blob, expected.blob, `Reviewed source drift: ${file}`);
}
console.log(`${batch.toUpperCase()} source/fixture blobs verified at ${pin.commit}`);
}
