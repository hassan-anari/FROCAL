import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { internalHarness, internalSnapshot, MemoryStorage } from "./testing.fixture";
import { journalSchema, TapTransportError, type TapSnapshot, type TapJournal } from "./model";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const saved = (storage: MemoryStorage) => journalSchema.parse(JSON.parse(storage.getItem("dalexio-tap-v2:verified-player")!));

it("stops input at exact cutoff without closing or discarding a pending durable event", async () => {
  let allowed = true;
  const storage = new MemoryStorage();
  let finish!: (snapshot: TapSnapshot) => void;
  let recovering = false;
  const h = internalHarness({ storage, canEarn: () => allowed, synchronize: async () => recovering ? new Promise(resolve => { finish = resolve; }) : internalSnapshot() });
  await h.controller.start();
  expect(h.controller.touch()).toBe(true);
  expect(h.controller.getSnapshot()).toMatchObject({ lifetime: 151, committed: { lifetime: 150 }, unresolvedEvents: 1 });
  allowed = false;
  expect(h.controller.touch()).toBe(false);
  recovering = true;
  const read = h.controller.resume();
  const original = saved(storage);
  expect(original.events).toHaveLength(1);
  expect(original.batches).toHaveLength(1);
  expect(h.controller.getSnapshot()).toMatchObject({ lifetime: 151, unresolvedEvents: 1 });
  const denied = { ...internalSnapshot(), revision: 2, earningAllowed: false, grant: null,
    rejections: [{ scope: original.batches[0].scope, key: original.batches[0].key, code: "SEASON_UNAVAILABLE" }] };
  finish(denied); await read;
  expect(h.controller.getSnapshot()).toMatchObject({ lifetime: 150, committed: { lifetime: 150 }, unresolvedEvents: 0 });
  expect(saved(storage).resolved[0]).toMatchObject({ key: original.batches[0].key, sequences: [1], code: "SEASON_UNAVAILABLE" });
  h.controller.close();
});

it("cutoff preserves an in-flight request and accepts only its matching server receipt", async () => {
  let allowed = true;
  let finish!: (snapshot: TapSnapshot) => void;
  let signal!: AbortSignal;
  const h = internalHarness({ canEarn: () => allowed, submit: async (batch, inputSignal) => {
    signal = inputSignal;
    const receipt = await h.settle(batch); // Server committed before the boundary; response is delayed.
    return new Promise(resolve => { finish = () => resolve(receipt); });
  } });
  await h.controller.start(); h.controller.touch();
  const request = h.controller.flush();
  await Promise.resolve();
  allowed = false;
  h.controller.requestCanonicalRefresh();
  expect(signal.aborted).toBe(false);
  expect(h.controller.touch()).toBe(false);
  expect(h.controller.getSnapshot().committed!.lifetime).toBe(150);
  finish(internalSnapshot()); await request;
  await Promise.resolve();
  expect(h.controller.getSnapshot()).toMatchObject({ lifetime: 151, committed: { lifetime: 151 }, unresolvedEvents: 0 });
  expect(h.submissions).toHaveLength(1);
  h.controller.close();
});

it("a committed-but-lost response replays the identical key after cutoff without a second reward", async () => {
  let allowed = true;
  let lose = true;
  const h = internalHarness({ canEarn: () => allowed, submit: async batch => {
    const receipt = await h.settle(batch);
    if (lose) { lose = false; throw new TapTransportError("retry"); }
    return receipt;
  } });
  await h.controller.start(); h.controller.touch();
  await h.controller.flush();
  allowed = false;
  expect(h.controller.touch()).toBe(false);
  h.advance(500); await h.controller.flush();
  expect(h.submissions[1]).toEqual(h.submissions[0]);
  expect(h.server().lifetime).toBe(151);
  expect(h.controller.getSnapshot()).toMatchObject({ committed: { lifetime: 151 }, unresolvedEvents: 0 });
  h.controller.close();
});

it("expiry never authorizes new input or rewrites an ambiguous batch", async () => {
  const storage = new MemoryStorage();
  const snapshot = internalSnapshot(); snapshot.grant!.expiresAt = 11_000;
  const h = internalHarness({ storage, snapshot, submit: async () => { throw new TapTransportError("retry"); } });
  await h.controller.start(); h.controller.touch(); await h.controller.flush();
  const original = saved(storage);
  h.advance(1000);
  expect(h.controller.touch()).toBe(false);
  expect(saved(storage).batches[0]).toEqual(original.batches[0]);
  expect(h.controller.getSnapshot().committed!.lifetime).toBe(150);
  h.controller.close();
  expect(saved(storage).events).toEqual(original.events);
});

it.each(["pending", "ambiguous"])("reload after cutoff preserves %s events and the original request identity until a server result", async kind => {
  const storage = new MemoryStorage();
  const first = internalHarness({ storage, submit: async () => { throw new TapTransportError("retry"); } });
  await first.controller.start(); first.controller.touch();
  if (kind === "ambiguous") await first.controller.flush();
  first.controller.close();
  const original = saved(storage);
  let received!: Readonly<TapJournal>;
  const reloaded = internalHarness({ storage, canEarn: () => false, synchronize: async journal => {
    received = structuredClone(journal);
    throw new TapTransportError("retry");
  } });
  await reloaded.controller.start();
  expect(reloaded.controller.touch()).toBe(false);
  expect(received.events).toEqual(original.events);
  expect(received.batches[0].sequences).toEqual([1]);
  if (original.batches.length) expect(received.batches[0].key).toBe(original.batches[0].key);
  expect(saved(storage).events).toEqual(original.events);
  expect(reloaded.controller.getSnapshot()).toMatchObject({ committed: null, unresolvedEvents: 1 });
  reloaded.controller.close();
});
