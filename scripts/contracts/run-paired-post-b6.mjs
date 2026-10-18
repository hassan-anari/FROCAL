import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const pin = JSON.parse(readFileSync("scripts/contracts/post-b6-pin.json", "utf8"));
const backend = resolve(process.env.POST_B6_BACKEND_ROOT ?? "work/backend-post-b6");
if (spawnSync("git", ["-C", backend, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim() !== pin.commit) throw Error("B6 exact final handoff checkout required");
if (spawnSync("git", ["-C", backend, "diff", "--quiet", "HEAD"]).status !== 0) throw Error("Unreviewed backend changes");
for (const [target, source] of Object.entries(pin.files)) if (!readFileSync(target).equals(readFileSync(resolve(backend, source.path)))) throw Error(`B6 pinned source drift: ${target}`);
if (!process.env.POSTGRES_DB?.startsWith("frocal_b6_") || process.env.POSTGRES_HOST !== "127.0.0.1") throw Error("Explicit isolated local frocal_b6_ database required");
let occupied = false;
try { await fetch("http://127.0.0.1:8792/__ready__", { signal: AbortSignal.timeout(1000) }); occupied = true; } catch {}
if (occupied) throw Error("Isolated paired HTTP port occupied");
const output = resolve("work/post-b6-paired"); mkdirSync(output, { recursive: true });
const originals = new Map();
for (const batch of ["b5", "b6"]) for (const name of readdirSync(resolve(backend, `docs/fixtures/${batch}`)).filter(n => n.endsWith(".json"))) { const path = resolve(backend, `docs/fixtures/${batch}`, name); originals.set(path, readFileSync(path)); }
const run = (bin, args, options = {}) => new Promise((done, reject) => { const child = spawn(bin, args, { stdio: "inherit", ...options }); child.once("error", reject); child.once("exit", code => code === 0 ? done() : reject(Error(`B6 paired failure: ${bin} (${code})`))); });
const environment = { ...process.env, B6_BACKEND_ROOT: backend, POST_B6_BACKEND_ROOT: backend, B4_RANKINGS_REDIS: "1", B6_FRESH_FIXTURES: output };
try {
  await run(resolve(backend, ".venv/bin/python"), ["-m", "pytest", "apps/clans/tests", "apps/arena/tests/test_post_b6_dissolved_rankings.py", "apps/notifications/tests/test_b6_start.py", "apps/players/tests/test_b4_group_images.py", "apps/rewards/tests/test_post_b6_history.py", "apps/notifications/tests/test_post_b6_clan_copy.py", "-q", `--junitxml=${output}/backend.xml`], { cwd: backend, env: { ...environment, B6_EXPORT_FIXTURES: "1", B5_EXPORT_FIXTURES: "1" } });
  for (const path of originals.keys()) { const batch = path.includes("/fixtures/b6/") ? "b6" : "b5"; mkdirSync(resolve(output, batch), { recursive: true }); writeFileSync(resolve(output, batch, path.split("/").at(-1)), readFileSync(path)); }
  const server = spawn(resolve(backend, ".venv/bin/python"), ["scripts/contracts/b2_server.py"], { env: environment, stdio: "inherit" });
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw Error("B6 harness exited"); try { if ((await fetch("http://127.0.0.1:8792/__ready__")).ok) { ready = true; break; } } catch {} await new Promise(done => setTimeout(done, 250)); }
    if (!ready) throw Error("B6 harness readiness failed");
    const failures = [];
    for (const args of [["vitest", "run", "--config", "vitest.post-b6-paired.config.ts"], ["playwright", "test", "--config", "playwright.post-b6-paired.config.ts"]]) { try { await run("npx", args, { env: environment }); } catch (error) { failures.push(error); } }
    if (failures.length) throw new AggregateError(failures, "B6 paired acceptance failed");
  } finally { server.kill("SIGTERM"); }
} finally { for (const [path, bytes] of originals) writeFileSync(path, bytes); }
