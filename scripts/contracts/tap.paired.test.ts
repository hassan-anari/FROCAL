import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createTapPort, normalizeTapState } from "../../src/integrations/api/tapV2";
import { tapBatchResultSchema, tapStateSchema } from "../../src/integrations/api/tapV2Contract";
import { TapController } from "../../src/game/base/tapV2/controller";
import { journalSchema, TapTransportError, type TapPort, type TapSubmission } from "../../src/game/base/tapV2/model";
import { MemoryStorage } from "../../src/game/base/tapV2/testing.fixture";

// Every economic request reaches the exact pinned Django code and isolated PostgreSQL.
// No synthetic wire responses; interception below only delays/drops actual responses.
const origin = "http://127.0.0.1:8792";
const nativeFetch = globalThis.fetch;
const controllers: TapController[] = [];
async function control(data: object): Promise<any> {
  const response = await nativeFetch(`${origin}/__b2_test__`, { method: "POST", body: JSON.stringify(data) });
  if (!response.ok) throw new Error(`Isolated control failed: ${response.status}`);
  return response.json();
}
beforeEach(async () => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("window", { setTimeout, clearTimeout, location: { origin } });
  await control({ action: "flags" });
  vi.stubGlobal("fetch", (url: string, options?: RequestInit) => {
    if (!url.startsWith("/api/v1/")) throw new Error("Paired requests must stay isolated");
    return nativeFetch(origin + url, options);
  });
});
afterEach(() => { controllers.splice(0).forEach((controller) => controller.close()); vi.unstubAllGlobals(); });
const signal = () => new AbortController().signal;
async function player(points = 150) { return control({ action: "player", points }); }
function make(identity: any, port: TapPort = createTapPort(identity.player, identity.initData), storage = new MemoryStorage()) {
  let elapsed = 0;
  const controller = new TapController({ player: identity.player, port, storage: () => storage,
    ownership: { acquire: async () => true, release: () => {} }, monotonicNow: () => elapsed, wallNow: () => elapsed });
  controllers.push(controller);
  return { controller, storage, advance: (ms: number) => { elapsed += ms; } };
}
async function fresh(identity: any, session = crypto.randomUUID()) {
  const port = createTapPort(identity.player, identity.initData);
  const journal = journalSchema.parse({ version: 1, player: identity.player, session, events: [], batches: [] });
  return { port, journal, snapshot: await port.synchronize(journal, signal()) };
}
function batch(snapshot: Awaited<ReturnType<typeof fresh>>["snapshot"], count: number, start = snapshot.grant!.sequenceCursor + 1): TapSubmission {
  return { scope: snapshot.grant!.scope, key: crypto.randomUUID(), sequences: Array.from({ length: count }, (_, i) => start + i) };
}
async function inspect(identity: any) { return control({ action: "inspect", player: identity.player }); }

it("preserves legitimate 150, displays authorized XP instantly, then commits through the actual API", async () => {
  const identity = await player();
  const port = createTapPort(identity.player, identity.initData);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const harness = make(identity, { ...port, submit: async (request, abort) => { await gate; return port.submit(request, abort); } });
  await harness.controller.start();
  expect(harness.controller.getSnapshot().lifetime).toBe(150);
  expect(harness.controller.touch()).toBe(true);
  const pending = harness.controller.flush();
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 151, authorizedUnsent: 1, committed: { lifetime: 150 } });
  expect((await inspect(identity)).lifetime).toBe(150);
  release(); await pending;
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 151, authorizedUnsent: 0, committed: { lifetime: 151 } });
  expect((await inspect(identity)).lifetime).toBe(151);
});

it.each([10.1, 86_410])("enforces 49/50/51 and server ten-second cooldown, with repeated bursts after %s server seconds", async (elapsed) => {
  const identity = await player();
  const harness = make(identity); await harness.controller.start();
  for (let burst = 0; burst < 2; burst++) {
    for (let i = 1; i <= 50; i++) {
      expect(harness.controller.touch()).toBe(true);
      expect(harness.controller.getSnapshot().lifetime).toBe(150 + burst * 50 + i);
    }
    expect(harness.controller.touch()).toBe(false);
    expect(harness.controller.getSnapshot().cooldownMs).toBe(10_000);
    await harness.controller.flush();
    expect(harness.controller.getSnapshot().authorizedUnsent).toBe(0);
    harness.advance(10_001); // Device time alone cannot replenish server allowance.
    expect(harness.controller.touch()).toBe(false);
    await harness.controller.resume();
    expect(harness.controller.touch()).toBe(false);
    await control({ action: "advance", seconds: elapsed });
    const updated = await control({ action: "credentials", player: identity.player });
    // Refresh with renewed Telegram authorization after crossing a day.
    harness.controller.close();
    identity.initData = updated.initData;
    const next = make(identity, undefined, harness.storage);
    await next.controller.start();
    Object.assign(harness, next);
  }
  expect((await inspect(identity)).lifetime).toBe(250);
});

it("crosses the exact server level/evolution threshold before the first request", async () => {
  const harness = make(await player(2499)); await harness.controller.start();
  expect(harness.controller.touch()).toBe(true);
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 2500, progression: { level: 5, stage: "explorer" }, levelChange: { evolved: true } });
  await harness.controller.flush();
  expect(harness.controller.getSnapshot().committed?.lifetime).toBe(2500);
});

it("recovers a lost committed response after reload using the exact durable body/key", async () => {
  const identity = await player(); const port = createTapPort(identity.player, identity.initData);
  const requests: TapSubmission[] = [];
  const one = make(identity, { ...port, submit: async (request, abort) => {
    requests.push(structuredClone(request)); await port.submit(request, abort); throw new TapTransportError("retry");
  } });
  await one.controller.start(); one.controller.touch(); await one.controller.flush(); one.controller.close();
  expect((await inspect(identity)).lifetime).toBe(151);
  const two = make(identity, { ...port, submit: async (request, abort) => { requests.push(structuredClone(request)); return port.submit(request, abort); } }, one.storage);
  await two.controller.start();
  expect(two.controller.getSnapshot()).toMatchObject({ lifetime: 151, authorizedUnsent: 0 });
  expect((await inspect(identity)).ledger_rows).toBe(2);
  expect(JSON.parse([...one.storage.data.values()][0]).events).toEqual([]);
});

it("restores unsent individual sequences into a stable microbatch before recovering a lease", async () => {
  const identity = await player(); const one = make(identity); await one.controller.start();
  one.controller.touch(); one.controller.touch(); one.controller.close();
  expect((await inspect(identity)).lifetime).toBe(150);
  const two = make(identity, undefined, one.storage); await two.controller.start();
  expect(two.controller.getSnapshot()).toMatchObject({ lifetime: 152, authorizedUnsent: 0 });
  expect((await inspect(identity)).ledger_rows).toBe(2);
});

it("uses immutable receipts for partial prefixes, duplicate replay, and rejects mismatched keys", async () => {
  const identity = await player(); const { port, snapshot } = await fresh(identity);
  const first = await port.submit(batch(snapshot, 25), signal());
  await control({ action: "advance", seconds: 0.1 });
  const tail = batch(first, 50);
  const partial = await port.submit(tail, signal());
  expect(partial.receipts[0]).toMatchObject({ accepted: 25, rejected: 25, through: 50 });
  const duplicate = await port.submit(tail, signal());
  expect(duplicate.receipts).toEqual(partial.receipts);
  expect((await inspect(identity)).lifetime).toBe(200);
  await expect(port.submit({ ...tail, sequences: tail.sequences.slice(0, 49) }, signal())).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
});

it("reconciles Daily/Mission/other ledger cursors even when Tap revision stays unchanged", async () => {
  const identity = await player(); const { port, journal, snapshot } = await fresh(identity);
  const committed = await port.submit(batch(snapshot, 1), signal());
  for (const source of ["DAILY", "MISSION", "TEST"]) await control({ action: "reward", player: identity.player, amount: 7, source });
  const newer = await port.synchronize(journal, signal());
  expect(newer.revision).toBe(committed.revision);
  expect(newer.receiptCursor).toBeGreaterThan(committed.receiptCursor);
  expect(newer.lifetime).toBe(172);
});

it("fences parallel devices and resolves rejected old events without reminting", async () => {
  const identity = await player(); const old = await fresh(identity);
  const otherSession = crypto.randomUUID();
  const headers = { Authorization: `tma ${identity.initData}`, "Content-Type": "application/json" };
  const denied = await nativeFetch(origin + "/api/v1/base/v2/tap-leases", { method: "POST", headers, body: JSON.stringify({ session_id: otherSession }) });
  expect(denied.status).toBe(409);
  const taken = await nativeFetch(origin + "/api/v1/base/v2/tap-leases", { method: "POST", headers, body: JSON.stringify({ session_id: otherSession, takeover: true, expected_generation: old.snapshot.grant!.scope.generation }) });
  expect(taken.status).toBe(200);
  const abandoned = batch(old.snapshot, 2);
  await expect(old.port.submit(abandoned, signal())).rejects.toMatchObject({ code: "LEASE_REVOKED", definitive: true });
  const recovery = old.port.synchronize({ ...old.journal, events: abandoned.sequences.map((sequence) => ({ scope: abandoned.scope, sequence })), batches: [{ ...abandoned, attempts: 1, blocked: false }] }, signal());
  await expect(recovery).rejects.toMatchObject({ code: "ACTIVE_SESSION", snapshot: { rejections: [{ key: abandoned.key, code: "LEASE_REVOKED" }] } });
  expect((await inspect(identity)).lifetime).toBe(150);
});

it("expires uncommitted lease events, while committed receipts survive expiry and current config changes", async () => {
  const identity = await player(); const { port, snapshot } = await fresh(identity);
  const accepted = batch(snapshot, 1); await port.submit(accepted, signal());
  await control({ action: "advance", seconds: 121 });
  const changed = await control({ action: "config", reward: 2, cooldown: 12 });
  const replay = await port.submit(accepted, signal());
  expect(replay.config).toBe(changed.version);
  expect(replay.receipts[0].scope.config).toBe(snapshot.grant!.scope.config);
  await expect(port.submit(batch(snapshot, 1, 2), signal())).rejects.toMatchObject({ code: "LEASE_EXPIRED", definitive: true });
  expect((await inspect(identity)).lifetime).toBe(151);
  await control({ action: "config", reward: 1, cooldown: 10 });
});

it("keeps reward/cooldown pinned through config publication and adopts new policy only on the next burst", async () => {
  const identity = await player(); const { port, journal, snapshot } = await fresh(identity);
  const published = await control({ action: "config", reward: 2, cooldown: 23 });
  const current = await port.synchronize(journal, signal());
  expect(current.config).toBe(published.version);
  expect(current.grant).toMatchObject({ pointsPerTouch: 1, cooldownDuration: 10_000 });
  expect(current.grant!.scope.config).toBe(snapshot.config);
  await port.submit(batch(current, 50), signal());
  await control({ action: "advance", seconds: 10.1 });
  const renewed = await port.synchronize(journal, signal());
  expect(renewed.grant).toMatchObject({ pointsPerTouch: 2, cooldownDuration: 23_000 });
  expect((await inspect(identity)).lifetime).toBe(200);
  await control({ action: "config", reward: 1, cooldown: 10 });
});

it("validates actual cached avatar delivery and fails softly when private storage is unavailable", async () => {
  const identity = await control({ action: "player", cached_avatar: true });
  const headers = { Authorization: `tma ${identity.initData}` };
  const bootstrap: any = await (await nativeFetch(origin + "/api/v1/bootstrap", { headers })).json();
  const url = new URL(bootstrap.player.photo_url);
  expect(url.origin).toBe("https://cached-avatar.test");
  const image = await nativeFetch(origin + url.pathname);
  expect(image.status).toBe(200); expect(image.headers.get("content-type")).toBe("image/jpeg");
  await control({ action: "flags", storage_unavailable: true });
  expect((await nativeFetch(origin + url.pathname)).status).toBe(503);
  expect((await nativeFetch(origin + "/api/v1/bootstrap", { headers })).status).toBe(200);
});

it("recovers an actual drained v1 receipt without duplicate credit and preserves unknown/unkeyed legacy evidence", async () => {
  const identity = await player();
  const pending = await control({ action: "legacy", player: identity.player });
  identity.initData = pending.initData;
  const raw = JSON.stringify({ buffer: 3, pending: { tapCount: pending.tapCount, idempotencyKey: pending.idempotencyKey, retries: 1 } });
  const key = `dalexio-base-tap-queue:${identity.player}`;
  localStorage.setItem(key, raw);
  const one = make(identity); await one.controller.start();
  expect(one.controller.getSnapshot().lifetime).toBe(157);
  expect(localStorage.getItem(key)).toBe(raw);
  expect(JSON.parse(localStorage.getItem(key + ":v2-recovery")!).resolution).toMatchObject({ status: "receipt-confirmed", unassignedTouches: 3 });
  await one.controller.resume();
  expect((await inspect(identity)).lifetime).toBe(157);
  localStorage.setItem(key, JSON.stringify({ buffer: 2, pending: { tapCount: 7, idempotencyKey: "never-submitted-legacy" } }));
  await one.controller.resume();
  expect(JSON.parse(localStorage.getItem(key + ":v2-recovery")!).resolution.status).toBe("receipt-unavailable");
  expect((await inspect(identity)).lifetime).toBe(157);
});

it("retains previous-Season receipt identity while applying the current Season snapshot", async () => {
  const identity = await player(); const { port, journal, snapshot } = await fresh(identity);
  const accepted = batch(snapshot, 1); await port.submit(accepted, signal());
  const next = await control({ action: "season" });
  const replay = await port.submit(accepted, signal());
  expect(replay.season).toBe(next.season);
  expect(replay.receipts[0].scope.season).toBe(snapshot.season);
  const newLease = await port.synchronize(journal, signal());
  expect(newLease.grant!.scope.season).toBe(next.season);
  expect(newLease.lifetime).toBe(151);
  expect(newLease.seasonPoints).toBe(0);
  await expect(port.submit(batch(snapshot, 1, 2), signal())).rejects.toMatchObject({ definitive: true });
});
