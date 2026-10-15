import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TapController } from "./controller";
import { internalHarness, internalSnapshot, MemoryStorage } from "./testing.fixture";
import { TapTransportError, journalSchema } from "./model";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("preserves authoritative 150 points, updates XP/level/stage synchronously before any network response", async () => {
  const submit = vi.fn(() => new Promise<never>(() => undefined));
  const { controller } = internalHarness({ submit });
  await controller.start();
  expect(controller.getSnapshot().lifetime).toBe(150);
  expect(controller.touch()).toBe(true);
  expect(controller.getSnapshot().lifetime).toBe(151);
  expect(controller.touch()).toBe(true);
  expect(controller.getSnapshot()).toMatchObject({ lifetime: 152, seasonPoints: 22, authorizedUnsent: 2, progression: { level: 5, stage: "explorer", nextThreshold: null } });
  expect(controller.getSnapshot().levelChange).toMatchObject({ previousLevel: 1, newLevel: 5, stage: "explorer", evolved: true });
  expect(submit).not.toHaveBeenCalled();
  void controller.flush();
  expect(submit).toHaveBeenCalledTimes(1);
  expect(controller.getSnapshot().lifetime).toBe(152);
  controller.close();
});

it("accepts the 49th and 50th, rejects the 51st and never renews locally after ten seconds", async () => {
  const harness = internalHarness(); await harness.controller.start();
  for (let i = 1; i <= 50; i++) {
    expect(harness.controller.touch()).toBe(true);
    expect(harness.controller.getSnapshot().lifetime).toBe(150 + i);
  }
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot().cooldownUntil).toBe(20_000);
  harness.advance(10_001);
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot().lifetime).toBe(200);
  harness.controller.close();
});

it("resends an identical request after a lost committed response without duplicate credit", async () => {
  let lost = true;
  const harness = internalHarness({ submit: async (batch) => {
    const receipt = await harness.settle(batch);
    if (lost) { lost = false; throw new TapTransportError("retry"); }
    return receipt;
  } });
  await harness.controller.start();
  harness.controller.touch(); harness.controller.touch();
  await harness.controller.flush();
  expect(harness.controller.getSnapshot().lifetime).toBe(152);
  harness.advance(500);
  await harness.controller.flush();
  expect(harness.submissions).toHaveLength(2);
  expect(harness.submissions[0].key).toBe(harness.submissions[1].key);
  expect(harness.submissions[0].sequences).toEqual(harness.submissions[1].sequences);
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 152, authorizedUnsent: 0, committed: { lifetime: 152 } });
  harness.controller.close();
});

it("keeps provisional cooldown through partial in-flight acknowledgements and replaces it with the server deadline", async () => {
  const harness = internalHarness(); await harness.controller.start();
  for (let i = 0; i < 50; i++) harness.controller.touch();
  expect(harness.controller.getSnapshot().isCoolingDown).toBe(true);
  await harness.controller.flush();
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 200, authorizedUnsent: 42, isCoolingDown: true });
  harness.advance(100);
  for (let i = 0; i < 6; i++) await harness.controller.flush();
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 200, authorizedUnsent: 0, cooldownUntil: 20_100 });
  harness.controller.close();
});

it("a partial rejection cannot leave an unearned evolution reveal visible", async () => {
  const harness = internalHarness({ submit: async (batch) => {
    const snapshot = internalSnapshot(); snapshot.revision = 2; snapshot.receiptCursor = 2;
    snapshot.lifetime = 151; snapshot.seasonPoints = 21;
    snapshot.grant!.remaining = 0; snapshot.grant!.sequenceCursor = 1; snapshot.cooldownUntil = 20_000;
    snapshot.receipts = [{ scope: batch.scope, key: batch.key, receiptId: 2, through: 1, accepted: 1, rejected: 1 }];
    return snapshot;
  } });
  await harness.controller.start(); harness.controller.touch(); harness.controller.touch();
  expect(harness.controller.getSnapshot().levelChange).not.toBeNull();
  await harness.controller.flush();
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 151, progression: { level: 1, stage: "newborn" }, levelChange: null });
  expect(harness.controller.touch()).toBe(false);
  harness.controller.close();
});

it("one in-flight batch permits new durable input without response rollback", async () => {
  let resolve!: (value: ReturnType<typeof internalSnapshot>) => void;
  const harness = internalHarness({ submit: () => new Promise((done) => { resolve = done; }) });
  await harness.controller.start(); harness.controller.touch();
  const first = harness.controller.flush();
  await harness.controller.flush();
  harness.controller.touch();
  const next = internalSnapshot();
  next.lifetime = 151; next.seasonPoints = 21; next.revision = 2;
  next.grant!.remaining = 49; next.grant!.sequenceCursor = 1;
  next.receiptCursor = 2;
  next.receipts = [{ scope: next.grant!.scope, key: "internal-request-1", through: 1, receiptId: 2, accepted: 1, rejected: 0 }];
  resolve(next); await first;
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 152, authorizedUnsent: 1 });
  harness.controller.close();
});

it("refresh requires fresh server state and resumes pending sequences under the same key", async () => {
  const storage = new MemoryStorage();
  const one = internalHarness({ storage, submit: async () => { throw new TapTransportError("retry"); } });
  await one.controller.start(); one.controller.touch(); await one.controller.flush(); one.controller.close();
  const raw = [...storage.data.values()][0];
  const old = journalSchema.parse(JSON.parse(raw));
  const two = internalHarness({ storage });
  expect(two.controller.touch()).toBe(false);
  await two.controller.start(); await two.controller.flush();
  expect(two.submissions[0].key).toBe(old.batches[0].key);
  expect(two.controller.getSnapshot()).toMatchObject({ lifetime: 151, authorizedUnsent: 0 });
  two.controller.close();
});

it.each(["backwards device time", "forwards device time", "monotonic expiry"])("expiry cannot be extended by %s", async (scenario) => {
  const snapshot = internalSnapshot(); snapshot.grant!.expiresAt = 11_000;
  const harness = internalHarness({ snapshot }); await harness.controller.start();
  if (scenario === "backwards device time") { harness.jumpWall(-999_999); harness.advance(1001); }
  if (scenario === "forwards device time") harness.jumpWall(1001);
  if (scenario === "monotonic expiry") harness.advance(1001);
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot().lifetime).toBe(150);
  harness.controller.close();
});

it("visibility suspension stops credit until server reconciliation", async () => {
  const { controller } = internalHarness(); await controller.start();
  controller.suspend(); expect(controller.touch()).toBe(false);
  await controller.resume(); expect(controller.touch()).toBe(true);
  controller.close();
});

it("stale acknowledgements cannot overwrite a newer different-device snapshot", async () => {
  const harness = internalHarness({ submit: async () => internalSnapshot() });
  await harness.controller.start();
  const fresh = internalSnapshot(); fresh.revision = 10; fresh.lifetime = 180;
  harness.replace(fresh); await harness.controller.resume();
  harness.controller.touch(); await harness.controller.flush();
  expect(harness.controller.getSnapshot().lifetime).toBe(181);
  expect(harness.controller.getSnapshot().committed!.revision).toBe(10);
  expect(harness.controller.getSnapshot().status).toBe("paused");
  harness.controller.close();
});

it("orders Daily/Mission rewards by ledger cursor, and retires a delayed receipt independently of its old balance", async () => {
  const harness = internalHarness({ submit: async (batch) => {
    const old = internalSnapshot(); old.lifetime = 151; old.receiptCursor = 2; old.revision = 2;
    old.grant!.sequenceCursor = 1; old.grant!.remaining = 49;
    old.receipts = [{ scope: batch.scope, key: batch.key, receiptId: 2, through: 1, accepted: 1, rejected: 0 }];
    return old;
  } });
  await harness.controller.start(); harness.controller.touch();
  const daily = internalSnapshot(); daily.lifetime = 180; daily.receiptCursor = 3; daily.revision = 1;
  // Fresh state already includes the Tap ledger plus the independent reward, but
  // the cursor is never used to retire the still-pending exact request.
  daily.grant!.sequenceCursor = 1; daily.grant!.remaining = 49;
  harness.replace(daily); await harness.controller.resume();
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 180, authorizedUnsent: 0 });
  await harness.controller.flush();
  expect(harness.controller.getSnapshot()).toMatchObject({ lifetime: 180, committed: { receiptCursor: 3, revision: 1 } });
  expect(JSON.parse([...((harness.storage as MemoryStorage).data.values())][0]).events).toEqual([]);
  harness.controller.close();
});

it("account switch cannot receive a late response from the previous controller", async () => {
  let resolve!: (value: ReturnType<typeof internalSnapshot>) => void;
  const callback = vi.fn();
  const harness = internalHarness({ submit: () => new Promise((done) => { resolve = done; }), onCommitted: callback });
  await harness.controller.start(); harness.controller.touch(); const request = harness.controller.flush();
  harness.controller.close(); callback.mockClear();
  resolve({ ...internalSnapshot(), lifetime: 999, revision: 5 }); await request;
  expect(callback).not.toHaveBeenCalled();
  expect(harness.controller.getSnapshot().status).toBe("closed");
});

it.each(["season", "config", "session", "lease"] as const)("%s rollover preserves unresolved old events and stops pricing them with a new grant", async (field) => {
  const harness = internalHarness(); await harness.controller.start(); harness.controller.touch();
  const next = internalSnapshot(); next.revision = 2;
  if (field === "season" || field === "config") next[field] = `new-${field}`;
  next.grant!.scope[field] = `new-${field}`;
  harness.replace(next); await harness.controller.resume();
  expect(harness.controller.touch()).toBe(false);
  const saved = JSON.parse([...((harness.storage as MemoryStorage).data.values())][0]);
  expect(saved.events).toHaveLength(1);
  expect(saved.events[0].scope[field]).not.toBe(`new-${field}`);
  harness.controller.close();
});

it("durability failures and tampering stop new optimistic credit without deleting evidence", async () => {
  const storage = new MemoryStorage();
  const harness = internalHarness({ storage }); await harness.controller.start();
  storage.setItem = () => { throw new Error("quota"); };
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot()).toMatchObject({ status: "storage-blocked", lifetime: 150 });
  harness.controller.close();
  const corrupt = new MemoryStorage(); corrupt.data.set("dalexio-tap-v2:verified-player", "corrupt");
  const second = internalHarness({ storage: corrupt }); await second.controller.start();
  expect(second.controller.touch()).toBe(false);
  expect(corrupt.getItem("dalexio-tap-v2:verified-player")).toBe("corrupt");
  second.controller.close();
});

it("rejects a different authenticated player in server responses", async () => {
  const snapshot = internalSnapshot(); snapshot.player = "other"; snapshot.grant = null;
  const harness = internalHarness({ synchronize: async () => snapshot }); await harness.controller.start();
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot().status).toBe("terminal");
  harness.controller.close();
});

it("terminal rejection removes local display credit, retains evidence, and accepts no further touches", async () => {
  const harness = internalHarness({ submit: async () => { throw new TapTransportError("terminal"); } });
  await harness.controller.start(); harness.controller.touch(); await harness.controller.flush();
  expect(harness.controller.getSnapshot()).toMatchObject({ status: "terminal", lifetime: 150 });
  expect(harness.controller.touch()).toBe(false);
  expect(JSON.parse([...((harness.storage as MemoryStorage).data.values())][0]).events).toHaveLength(1);
  harness.controller.close();
  const restarted = internalHarness({ storage: harness.storage }); await restarted.controller.start();
  expect(restarted.controller.getSnapshot().status).toBe("terminal");
  expect(restarted.controller.touch()).toBe(false);
  restarted.controller.close();
});

it("bounded journal never accepts beyond its capacity or stores credentials/reward totals", async () => {
  const snapshot = internalSnapshot(); snapshot.grant!.remaining = 2000;
  const storage = new MemoryStorage();
  storage.setItem("dalexio-tap-v2:verified-player", JSON.stringify({ version: 1, player: snapshot.player,
    events: Array.from({ length: 1023 }, (_, index) => ({ scope: snapshot.grant!.scope, sequence: index + 1 })), batches: [] }));
  const harness = internalHarness({ snapshot, storage }); await harness.controller.start();
  expect(harness.controller.touch()).toBe(true);
  expect(harness.controller.touch()).toBe(false);
  const raw = [...((harness.storage as MemoryStorage).data.values())][0];
  expect(raw).not.toMatch(/initData|authorization|lifetime|seasonPoints|pointsPerTouch/);
  expect(JSON.parse(raw).events).toHaveLength(1024);
  harness.controller.close();
});

it("persisted forged progress cannot exceed a freshly issued server allowance", async () => {
  const storage = new MemoryStorage(); const scope = internalSnapshot().grant!.scope;
  storage.setItem("dalexio-tap-v2:verified-player", JSON.stringify({ version: 1, player: scope.player,
    events: Array.from({ length: 51 }, (_, index) => ({ scope, sequence: index + 1 })), batches: [] }));
  const harness = internalHarness({ storage }); await harness.controller.start();
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot().lifetime).toBeNull();
  expect(harness.controller.getSnapshot().authorizedUnsent).toBe(0);
  expect(JSON.parse(storage.getItem("dalexio-tap-v2:verified-player")!).events).toHaveLength(51);
  harness.controller.close();
});

it("refuses a second local owner", async () => {
  const controller = new TapController({ player: "verified-player", storage: () => new MemoryStorage(),
    ownership: { acquire: async () => false, release: vi.fn() },
    port: { synchronize: vi.fn(), submit: vi.fn() } });
  await controller.start();
  expect(controller.getSnapshot().status).toBe("session-busy");
  expect(controller.touch()).toBe(false); controller.close();
});

it("coalesces repeated Retry/online/resume actions without cancelling an in-flight recovery", async () => {
  let resolve!: (snapshot: ReturnType<typeof internalSnapshot>) => void;
  let signal!: AbortSignal;
  const synchronize = vi.fn((_journal, abort: AbortSignal) => {
    signal = abort;
    return new Promise<ReturnType<typeof internalSnapshot>>((done) => { resolve = done; });
  });
  const harness = internalHarness({ synchronize });
  const start = harness.controller.start();
  await Promise.resolve();
  expect(harness.controller.getSnapshot().recovering).toBe(true);
  await Promise.all(Array.from({ length: 20 }, () => harness.controller.resume()));
  expect(synchronize).toHaveBeenCalledTimes(1);
  expect(signal.aborted).toBe(false);
  resolve(internalSnapshot());
  await start;
  expect(harness.controller.getSnapshot()).toMatchObject({ status: "ready", recovering: false });
  harness.controller.close();
});

it("refuses a refresh during pending settlement and freezes input only after acknowledgement", async () => {
  const harness = internalHarness();
  await harness.controller.start();
  harness.controller.touch();
  expect(harness.controller.prepareReload()).toBe(false);
  await harness.controller.flush();
  expect(harness.controller.prepareReload()).toBe(true);
  expect(harness.controller.touch()).toBe(false);
  harness.controller.close();
});

it("never automatically switches a fenced client and requires a separate explicit operation", async () => {
  const moved = internalSnapshot(); moved.grant = null;
  moved.ownership = { status: "SESSION_MOVED", generation: 2, activeUntil: 20_000, explicitSwitchRequired: true };
  const failure = new TapTransportError("reauthorize", 0, "LEASE_REVOKED"); failure.snapshot = moved;
  const synchronize = vi.fn(async () => { throw failure; });
  const switched = internalSnapshot(); switched.ownership = { ...moved.ownership, status: "OWNED", generation: 3, explicitSwitchRequired: false };
  const switchSession = vi.fn(async () => switched);
  const controller = new TapController({ player: moved.player, storage: () => new MemoryStorage(),
    ownership: { acquire: async () => true, release: () => {} }, port: { synchronize, switchSession, submit: vi.fn() } });
  await controller.start();
  expect(controller.getSnapshot()).toMatchObject({ status: "paused", error: "LEASE_REVOKED", canSwitchDevice: true });
  await vi.advanceTimersByTimeAsync(60_000);
  expect(synchronize).toHaveBeenCalledTimes(1);
  expect(switchSession).not.toHaveBeenCalled();
  await controller.switchToThisDevice();
  expect(switchSession).toHaveBeenCalledWith(expect.anything(), 2, expect.any(AbortSignal));
  expect(controller.getSnapshot()).toMatchObject({ status: "ready", canSwitchDevice: false });
  controller.close();
});

it("does not release a session with unacknowledged events", async () => {
  const snapshot = internalSnapshot(); snapshot.ownership = { status: "OWNED", generation: 1, activeUntil: 20_000, explicitSwitchRequired: false };
  const releaseSession = vi.fn(); const storage = new MemoryStorage();
  const controller = new TapController({ player: snapshot.player, storage: () => storage,
    ownership: { acquire: async () => true, release: () => {} },
    port: { synchronize: async () => snapshot, releaseSession, submit: vi.fn() } });
  await controller.start(); controller.touch();
  await controller.releaseSession();
  expect(releaseSession).not.toHaveBeenCalled();
  expect(JSON.parse(storage.getItem("dalexio-tap-v2:verified-player")!).events).toHaveLength(1);
  controller.close();
});

it("waits for best-effort release before resuming after a rapid reopen", async () => {
  const snapshot = internalSnapshot(); snapshot.ownership = { status: "OWNED", generation: 1, activeUntil: 20_000, explicitSwitchRequired: false };
  let released!: () => void;
  const releaseSession = vi.fn(() => new Promise<void>((resolve) => { released = resolve; }));
  const synchronize = vi.fn(async () => snapshot);
  const controller = new TapController({ player: snapshot.player, storage: () => new MemoryStorage(),
    ownership: { acquire: async () => true, release: () => {} }, port: { synchronize, releaseSession, submit: vi.fn() } });
  await controller.start();
  const leaving = controller.releaseSession();
  const resume = controller.resume();
  expect(synchronize).toHaveBeenCalledTimes(1);
  released(); await leaving; await resume;
  expect(synchronize).toHaveBeenCalledTimes(2);
  controller.close();
});

it("waits out an explicit-switch cooldown with a read and never repeats takeover automatically", async () => {
  const snapshot = internalSnapshot(); snapshot.grant = null;
  snapshot.ownership = { status: "ANOTHER_DEVICE", generation: 1, activeUntil: 120_000, explicitSwitchRequired: true };
  const conflict = new TapTransportError("reauthorize", 0, "ACTIVE_SESSION"); conflict.snapshot = snapshot;
  const cooldown = new TapTransportError("rate-limit", 2000, "COOLDOWN"); cooldown.snapshot = snapshot;
  const synchronize = vi.fn(async () => { throw conflict; });
  const switchSession = vi.fn(async () => { throw cooldown; });
  const controller = new TapController({ player: snapshot.player, storage: () => new MemoryStorage(),
    ownership: { acquire: async () => true, release: () => {} }, port: { synchronize, switchSession, submit: vi.fn() } });
  await controller.start(); await controller.switchToThisDevice();
  expect(controller.getSnapshot()).toMatchObject({ status: "paused", error: "COOLDOWN" });
  await vi.advanceTimersByTimeAsync(2000);
  expect(synchronize).toHaveBeenCalledTimes(2);
  expect(switchSession).toHaveBeenCalledTimes(1);
  expect(controller.getSnapshot().error).toBe("ACTIVE_SESSION");
  controller.close();
});
