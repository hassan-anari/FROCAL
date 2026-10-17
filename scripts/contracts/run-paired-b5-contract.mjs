import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const pin = JSON.parse(readFileSync("scripts/contracts/b5-pin.json", "utf8"));
const backend = resolve(process.env.B5_BACKEND_ROOT ?? "work/backend-b5");
const head = spawnSync("git", ["-C", backend, "rev-parse", "HEAD"], { encoding: "utf8" });
if (head.status !== 0 || head.stdout.trim() !== pin.commit) throw new Error("B5 paired checkout must match the exact runtime pin");
if (spawnSync("git", ["-C", backend, "diff", "--quiet", "HEAD"]).status !== 0) throw new Error("B5 backend checkout has unreviewed tracked changes");
for (const [target, source] of Object.entries(pin.files)) if (!readFileSync(target).equals(readFileSync(resolve(backend, source.path)))) throw new Error(`B5 paired source drift: ${target}`);
if (!process.env.POSTGRES_DB?.startsWith("frocal_b5_") || process.env.POSTGRES_HOST !== "127.0.0.1") throw new Error("Isolated local frocal_b5_ database required");
const output = resolve("work/b5-paired"); mkdirSync(output, { recursive: true });
const fixtureNames = ["clan-http.json", "authority-http.json", "lifecycle-http.json"];
const originals = new Map(fixtureNames.map(name => [resolve(backend, "docs/fixtures/b5", name), readFileSync(resolve(backend, "docs/fixtures/b5", name))]));
const run = (bin, args, options = {}) => new Promise((done, reject) => {
  const child = spawn(bin, args, { stdio: "inherit", ...options });
  child.once("error", reject); child.once("exit", code => code === 0 ? done() : reject(new Error(`B5 paired contract failure: ${bin} (${code})`)));
});
try {
  // Actual pinned Clan API/domain/governance/economy/concurrency tests. Transport fakes
  // stay at Telegram boundaries; no shared database, production request or live send.
  await run(resolve(backend, ".venv/bin/python"), ["-m", "pytest", "apps/clans/tests", "-q", `--junitxml=${output}/backend.xml`], { cwd: backend, env: { ...process.env, B5_EXPORT_FIXTURES: "1" } });
  const fresh = resolve(output, "clan-http.json");
  for (const name of fixtureNames) writeFileSync(resolve(output, name), readFileSync(resolve(backend, "docs/fixtures/b5", name)));
  const environment = { ...process.env, B5_BACKEND_ROOT: backend, B5_LIVE_FIXTURE: fresh, B5_AUTHORITY_FIXTURE: resolve(output, "authority-http.json"), B5_LIFECYCLE_FIXTURE: resolve(output, "lifecycle-http.json") };
  const server = spawn(resolve(backend, ".venv/bin/python"), ["scripts/contracts/b2_server.py"], { stdio: "inherit", env: environment });
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error("B5 HTTP harness failed to start");
      try { if ((await fetch("http://127.0.0.1:8792/__ready__")).ok) { ready = true; break; } } catch {}
      await new Promise(done => setTimeout(done, 250));
    }
    if (!ready) throw new Error("B5 HTTP readiness failed");
    await run("npx", ["vitest", "run", "--config", "vitest.b5-paired.config.ts"], { env: environment });
    await run("npx", ["playwright", "test", "--config", "playwright.b5-paired.config.ts"], { env: environment });
  } finally { server.kill("SIGTERM"); }
} finally { for (const [path, bytes] of originals) writeFileSync(path, bytes); }
