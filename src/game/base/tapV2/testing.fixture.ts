// Synthetic INTERNAL fixture. Not a backend DTO, production config, or live server.
import { type TapSubmission, type TapJournal, type TapPort, type TapSnapshot } from "./model";
import { TapController } from "./controller";
import type { DurableStorage } from "./journal";

export function internalSnapshot(): TapSnapshot {
  const progression = { levels: [{ level: 1, minimum: 0 }, { level: 5, minimum: 152 }], stages: [{ key: "newborn" as const, minimumLevel: 1 }, { key: "explorer" as const, minimumLevel: 5 }] };
  return {
    player: "verified-player", season: "test-season", config: "test-config", revision: 1, serverTime: 10_000,
    lifetime: 150, seasonPoints: 20, earningAllowed: true, progression,
    cooldownUntil: null, acknowledgements: [],
    grant: {
      scope: { player: "verified-player", season: "test-season", config: "test-config", session: "session-a", lease: "lease-a" },
      expiresAt: 1_000_000, remaining: 50, sequenceCursor: 0,
      pointsPerTouch: 1, cooldownDuration: 10_000, batchLimit: 8, progression,
    },
  };
}
export class MemoryStorage implements DurableStorage {
  data = new Map<string, string>();
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
}
export function internalHarness(options: {
  snapshot?: TapSnapshot; storage?: DurableStorage;
  submit?: TapPort["submit"]; synchronize?: TapPort["synchronize"];
  onCommitted?: (snapshot: TapSnapshot) => void;
} = {}) {
  let snapshot = structuredClone(options.snapshot ?? internalSnapshot());
  let now = 0;
  let wall = 1_000_000;
  const receipts = new Map<string, TapSnapshot>();
  const submissions: TapSubmission[] = [];
  const storage = options.storage ?? new MemoryStorage();
  const settle = async (batch: Readonly<TapSubmission>) => {
    submissions.push(structuredClone(batch));
    if (receipts.has(batch.key)) return structuredClone(receipts.get(batch.key)!);
    const last = batch.sequences[batch.sequences.length - 1];
    const count = batch.sequences.length;
    snapshot = { ...snapshot, revision: snapshot.revision + 1, serverTime: 10_000 + now,
      lifetime: snapshot.lifetime + count, seasonPoints: snapshot.seasonPoints + count,
      grant: { ...snapshot.grant!, remaining: snapshot.grant!.remaining - count, sequenceCursor: last },
      acknowledgements: [{ scope: batch.scope, through: last }],
    };
    if (snapshot.grant!.remaining === 0) snapshot.cooldownUntil = snapshot.serverTime + snapshot.grant!.cooldownDuration;
    receipts.set(batch.key, structuredClone(snapshot));
    return structuredClone(snapshot);
  };
  let key = 0;
  const controller = new TapController({
    player: snapshot.player, port: { submit: options.submit ?? settle, synchronize: options.synchronize ?? (async (_journal: Readonly<TapJournal>) => structuredClone(snapshot)) },
    storage: () => storage, ownership: { acquire: async () => true, release: () => undefined },
    monotonicNow: () => now, wallNow: () => wall,
    requestKey: () => `internal-request-${++key}`, onCommitted: options.onCommitted,
  });
  return { controller, storage, submissions, settle,
    advance: (ms: number) => { now += ms; wall += ms; },
    jumpWall: (ms: number) => { wall += ms; },
    server: () => snapshot,
    replace: (next: TapSnapshot) => { snapshot = structuredClone(next); },
  };
}
