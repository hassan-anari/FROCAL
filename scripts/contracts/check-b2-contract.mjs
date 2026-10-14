import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const pin = JSON.parse(readFileSync("scripts/contracts/b2-pin.json", "utf8"));
for (const [file, expected] of Object.entries(pin.files)) {
  const bytes = readFileSync(file);
  const blob = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
  assert.equal(blob, expected.blob, `Reviewed B2 source drift: ${file}`);
}
console.log(`B2 source/fixture blobs verified at ${pin.commit}`);
