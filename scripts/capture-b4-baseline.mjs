import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// The approved pre-edit release, never the PR head or an automatically accepted diff.
const baseline = "ae91624f23a48d8a9973154520284706a9df1c21";
const root = process.cwd();
const checkout = resolve("work/b4-approved-ui");
const output = resolve("work/b4-baseline-dist");
const command = (bin, args, options = {}) => new Promise((done, reject) => {
  const child = spawn(bin, args, { cwd: root, stdio: "inherit", ...options });
  child.once("error", reject);
  child.once("exit", code => code === 0 ? done() : reject(new Error(`Baseline command failed: ${bin}`)));
});
mkdirSync("work", { recursive: true });
if (spawnSync("git", ["cat-file", "-e", `${baseline}^{commit}`]).status !== 0) {
  await command("git", ["fetch", "--depth=1", "origin", baseline]);
}
if (!existsSync(checkout)) await command("git", ["worktree", "add", "--detach", checkout, baseline]);
const head = spawnSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" });
if (head.status !== 0 || head.stdout.trim() !== baseline || spawnSync("git", ["-C", checkout, "diff", "--quiet"]).status !== 0) throw new Error("Approved UI baseline checkout changed");
const environment = { ...process.env, VITE_DATA_SOURCE: "remote", VITE_ENABLE_DEV_PANEL: "false", VITE_ENABLE_ARENA_DEBUG: "false" };
const vite = resolve("node_modules/vite/bin/vite.js");
await command(process.execPath, [vite, "build", "--outDir", output], { cwd: checkout, env: environment });
const server = spawn(process.execPath, [vite, "preview", "--outDir", output, "--host", "127.0.0.1", "--port", "4176", "--strictPort"], { cwd: checkout, env: environment, stdio: "inherit" });
try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error("Approved baseline preview failed to start");
    try { if ((await fetch("http://127.0.0.1:4176")).ok) { ready = true; break; } } catch {}
    await new Promise(done => setTimeout(done, 250));
  }
  if (!ready) throw new Error("Approved baseline preview readiness failed");
  await command(process.execPath, [resolve("node_modules/@playwright/test/cli.js"), "test", "--config", "playwright.b4.config.ts", "e2e/b4-visual.spec.ts"], { env: { ...environment, B4_BASELINE: "1" } });
  writeFileSync("docs/evidence/b4/baseline-provenance.json", JSON.stringify({ source_commit: baseline, renderer: "same Playwright/browser installation as the subsequent B4 gate", platform: process.platform, architecture: process.arch, node: process.version }, null, 2) + "\n");
} finally { server.kill("SIGTERM"); }
