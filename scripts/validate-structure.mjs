import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const required = [
  "src/app/router.tsx",
  "src/app/providers/AppProviders.tsx",
  "src/integrations/telegram/adapter.ts",
  "src/integrations/api/bootstrap.ts",
  "src/design-system/styles/tokens.css",
  "src/assets/manifest.json",
  "src/game/domain/schemas.ts",
  "src/mocks/handlers/bootstrap.handlers.ts",
];

const missing = [];
for (const file of required) {
  try {
    await access(path.join(process.cwd(), file), constants.R_OK);
  } catch {
    missing.push(file);
  }
}

if (missing.length) {
  console.error("Missing Phase 0 architecture files:\n" + missing.join("\n"));
  process.exit(1);
}
console.log(`Structure validation passed: ${required.length} core files found.`);
