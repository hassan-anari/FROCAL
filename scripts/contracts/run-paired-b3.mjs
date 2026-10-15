import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const pin = JSON.parse(readFileSync("scripts/contracts/b3-pin.json", "utf8"));
const backend = resolve(process.env.B3_BACKEND_ROOT ?? "work/backend");
const head = spawnSync("git", ["-C", backend, "rev-parse", "HEAD"], { encoding: "utf8" });
if (head.status !== 0 || head.stdout.trim() !== pin.commit) throw new Error("Paired B3 backend checkout must match the reviewed pin");
for (const [target, source] of Object.entries(pin.files)) {
  if (!readFileSync(target).equals(readFileSync(resolve(backend, source.path)))) throw new Error(`Paired source mismatch: ${target}`);
}
const environment = { ...process.env, B3_BACKEND_ROOT: backend };
if (!environment.POSTGRES_DB?.startsWith("frocal_b3_") || !["localhost", "127.0.0.1"].includes(environment.POSTGRES_HOST)) throw new Error("Explicit isolated local database required");
const python = resolve(backend, ".venv/bin/python");
console.log("Applying isolated pinned backend migrations before HTTP readiness");
await new Promise((done, reject) => {
  const migration = spawn(python, ["manage.py", "migrate", "--noinput", "--verbosity", "0"], {
    cwd: backend, env: { ...environment, DJANGO_SETTINGS_MODULE: "dexo_land.settings.test" }, stdio: "inherit",
  });
  migration.once("error", reject);
  migration.once("exit", (code) => code === 0 ? done() : reject(new Error("Isolated migrations failed")));
});
const server = spawn(python, ["scripts/contracts/b2_server.py"], { env: environment, stdio: "inherit" });
const run = (args) => new Promise((done, reject) => {
  const child = spawn("npx", args, { env: environment, stdio: "inherit" });
  child.once("error", reject); child.once("exit", (code) => code === 0 ? done() : reject(new Error(`Paired validation failed (${args[0]})`)));
});
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error("Isolated backend failed to start");
    try { const response = await fetch("http://127.0.0.1:8792/__ready__"); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((done) => setTimeout(done, 250));
  }
  if (!ready) throw new Error("Isolated backend readiness failed");
  await run(["vitest", "run", "--config", "vitest.b3-paired.config.ts"]);
  await run(["playwright", "test", "--config", "playwright.paired.config.ts"]);
} finally { server.kill("SIGTERM"); }
