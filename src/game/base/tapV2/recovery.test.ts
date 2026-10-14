import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { inspectLegacyQueues, recoverLegacyQueues } from "./legacyRecovery";
import { internalHarness, internalSnapshot, MemoryStorage } from "./testing.fixture";
import { TapTransportError, snapshotSchema } from "./model";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("inventories legacy queues under verified aliases without replay, repricing or deletion", () => {
  const storage = new MemoryStorage();
  const queue = JSON.stringify({ buffer: 7, pending: { tapCount: 12, idempotencyKey: "original-v1-key", retries: 2 } });
  storage.setItem("dalexio-base-tap-queue:verified-player", queue);
  storage.setItem("dalexio-base-tap-queue:42", "malformed-but-preserved");
  storage.setItem("dalexio-base-tap-queue:99", queue);
  storage.setItem("dalexio-base-tap-daily:42", JSON.stringify({ todayPoints: 1_000_000, lifetimeFloor: 1_000_000 }));
  const original = [...storage.data];
  expect(inspectLegacyQueues(storage, ["verified-player", "42", "42"])).toEqual([
    { key: "dalexio-base-tap-queue:verified-player", status: "backend-review-required", pending: { tapCount: 12, idempotencyKey: "original-v1-key" }, unassignedTouches: 7 },
    { key: "dalexio-base-tap-queue:42", status: "invalid-preserved", pending: null, unassignedTouches: null },
  ]);
  expect([...storage.data]).toEqual(original);
});

it("replays only exact keyed legacy requests, retains raw evidence and never converts an unkeyed buffer", async () => {
  const storage = new MemoryStorage();
  const key = "dalexio-base-tap-queue:42";
  const raw = JSON.stringify({ buffer: 3, pending: { tapCount: 7, idempotencyKey: "original-key", retries: 2 } });
  storage.setItem(key, raw);
  const replay = vi.fn(async () => "confirmed" as const);
  expect(await recoverLegacyQueues(storage, ["42"], replay)).toMatchObject([{ status: "receipt-confirmed", unassignedTouches: 3 }]);
  await recoverLegacyQueues(storage, ["42"], replay);
  expect(replay).toHaveBeenCalledExactlyOnceWith({ tapCount: 7, idempotencyKey: "original-key" });
  expect(storage.getItem(key)).toBe(raw);
  storage.setItem(key, JSON.stringify({ buffer: 2, pending: null }));
  expect(await recoverLegacyQueues(storage, ["42"], replay)).toMatchObject([{ status: "unkeyed-preserved" }]);
  expect(replay).toHaveBeenCalledTimes(1);
});

it("empty v1 queue never claims a reward from a daily state/floor", () => {
  const storage = new MemoryStorage();
  storage.setItem("dalexio-base-tap-queue:42", JSON.stringify({ buffer: 0, pending: null }));
  expect(inspectLegacyQueues(storage, ["42"])[0].status).toBe("empty");
});

it("server-issued repeated bursts remain unlimited across midnight; local cooldown never authorizes renewal", async () => {
  const harness = internalHarness(); await harness.controller.start();
  for (let burst = 0; burst < 4; burst++) {
    for (let tap = 0; tap < 50; tap++) expect(harness.controller.touch()).toBe(true);
    for (let batch = 0; batch < 7; batch++) await harness.controller.flush();
    expect(harness.controller.getSnapshot().lifetime).toBe(150 + (burst + 1) * 50);
    expect(harness.controller.touch()).toBe(false);
    harness.advance(10_000);
    expect(harness.controller.touch()).toBe(false);
    const next = structuredClone(harness.server());
    next.revision++; next.serverTime += 10_000; next.cooldownUntil = null;
    next.grant!.scope.lease = `renewed-${burst}`;
    next.grant!.sequenceCursor = 0; next.grant!.remaining = 50;
    next.grant!.expiresAt = next.serverTime + 30_000;
    if (burst === 1) harness.jumpWall(86_400_000); // UTC change has no reward-reset behavior.
    harness.replace(next); await harness.controller.resume();
  }
  expect(harness.controller.getSnapshot().committed!.lifetime).toBe(350);
  harness.controller.close();
});

it("rate-limit Retry-After is honored, retries stay bounded, pending request key is unchanged", async () => {
  const submit = vi.fn(async () => { throw new TapTransportError("rate-limit", 2000); });
  const harness = internalHarness({ submit }); await harness.controller.start(); harness.controller.touch();
  await harness.controller.flush();
  harness.advance(1999); await vi.advanceTimersByTimeAsync(1999); expect(submit).toHaveBeenCalledTimes(1);
  harness.controller.touch(); // New input must not bypass Retry-After.
  await harness.controller.flush(); expect(submit).toHaveBeenCalledTimes(1);
  harness.advance(1); await vi.advanceTimersByTimeAsync(1); expect(submit).toHaveBeenCalledTimes(2);
  for (let i = 0; i < 5; i++) { harness.advance(30_000); await vi.advanceTimersByTimeAsync(30_000); }
  expect(submit).toHaveBeenCalledTimes(6);
  expect(new Set(submit.mock.calls.map((call) => (call as unknown as [{ key: string }])[0].key)).size).toBe(1);
  expect(harness.controller.getSnapshot().status).toBe("paused");
  harness.controller.close();
});

it("rejects malformed/unordered policies and mismatched grants rather than guessing economics", () => {
  const snapshot = internalSnapshot();
  snapshot.progression.levels.reverse();
  expect(snapshotSchema.safeParse(snapshot).success).toBe(false);
  const mismatch = internalSnapshot(); mismatch.grant!.scope.player = "other";
  expect(snapshotSchema.safeParse(mismatch).success).toBe(false);
});

it("external journal mutation fails closed before adding visual XP", async () => {
  const storage = new MemoryStorage(); const harness = internalHarness({ storage }); await harness.controller.start();
  storage.setItem("dalexio-tap-v2:verified-player", "tampered");
  expect(harness.controller.touch()).toBe(false);
  expect(harness.controller.getSnapshot()).toMatchObject({ status: "storage-blocked", lifetime: 150 });
  expect(storage.getItem("dalexio-tap-v2:verified-player")).toBe("tampered");
  harness.controller.close();
});

it("a lost response times out and retries the durable original request instead of hanging forever", async () => {
  const requests: Array<{ key: string; sequences: number[] }> = [];
  const harness = internalHarness({ submit: async (batch) => {
    requests.push({ key: batch.key, sequences: [...batch.sequences] });
    return new Promise<never>(() => undefined);
  } });
  await harness.controller.start(); harness.controller.touch();
  const first = harness.controller.flush();
  harness.advance(12_000); await vi.advanceTimersByTimeAsync(12_000); await first;
  expect(harness.controller.getSnapshot().lifetime).toBe(151);
  harness.advance(500); await vi.advanceTimersByTimeAsync(500);
  expect(requests).toHaveLength(2);
  expect(requests[1]).toEqual(requests[0]);
  harness.controller.close();
  await vi.runAllTimersAsync();
});

it.each([600_000, Number.NaN])("pauses rather than shortening an unsafe/long server retry window (%s)", async (wait) => {
  const submit = vi.fn(async () => { throw new TapTransportError("rate-limit", wait); });
  const harness = internalHarness({ submit }); await harness.controller.start(); harness.controller.touch();
  await harness.controller.flush();
  await vi.advanceTimersByTimeAsync(300_000);
  expect(submit).toHaveBeenCalledTimes(1);
  expect(harness.controller.getSnapshot().status).toBe("paused");
  harness.controller.close();
});
