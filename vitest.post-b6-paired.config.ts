import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";
class SourceTimeFirst extends BaseSequencer {
  async sort(files: TestSpecification[]) {
    // Actual PostgreSQL-clock lifecycle cases precede legacy invitation-expiry
    // fixtures that advance the synthetic clock. Both complete suites still run.
    return [...files].sort((a, b) => Number(b.moduleId.includes("/b6/")) - Number(a.moduleId.includes("/b6/")));
  }
}
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } }, test: { include: ["scripts/contracts/b5/http.paired.test.ts", "scripts/contracts/b6/*.paired.test.ts", "scripts/contracts/post-b6/*.paired.test.ts"], environment: "node", fileParallelism: false, sequence: { sequencer: SourceTimeFirst } } });
