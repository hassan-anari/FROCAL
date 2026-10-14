import { z } from "zod";
import type { DurableStorage } from "./journal";

const legacyQueueSchema = z.object({
  buffer: z.number().int().nonnegative().safe(),
  pending: z.object({
    tapCount: z.number().int().positive().safe(),
    idempotencyKey: z.string().min(1).max(100),
    retries: z.number().int().nonnegative().optional(),
  }).nullable(),
});
export interface LegacyRecoveryItem {
  key: string;
  status: "backend-review-required" | "invalid-preserved" | "empty";
  // Retain the exact request key/count, but do not issue a v1/v2 request automatically.
  pending: { tapCount: number; idempotencyKey: string } | null;
  unassignedTouches: number | null;
}

/** Call only with identifiers verified by Bootstrap, including verified legacy aliases.
 * Raw legacy daily state is never used as an XP floor, allowance or credit source.
 * No queue is deleted/mutated and no buffer is converted to new lease events.
 */
export function inspectLegacyQueues(storage: DurableStorage, verifiedPlayerIds: readonly string[]): LegacyRecoveryItem[] {
  return [...new Set(verifiedPlayerIds)].filter(Boolean).flatMap<LegacyRecoveryItem>((player) => {
    const key = `dalexio-base-tap-queue:${player}`;
    const raw = storage.getItem(key);
    if (raw === null) return [];
    if (raw.length > 256_000) return [{ key, status: "invalid-preserved" as const, pending: null, unassignedTouches: null }];
    try {
      const queue = legacyQueueSchema.parse(JSON.parse(raw));
      return [{
        key, status: queue.pending || queue.buffer > 0 ? "backend-review-required" as const : "empty" as const,
        pending: queue.pending ? { tapCount: queue.pending.tapCount, idempotencyKey: queue.pending.idempotencyKey } : null,
        unassignedTouches: queue.buffer,
      }];
    } catch { return [{ key, status: "invalid-preserved" as const, pending: null, unassignedTouches: null }]; }
  });
}

export interface LegacyResolution { key: string; requestKey: string | null; status: "receipt-confirmed" | "receipt-unavailable" | "unkeyed-preserved"; unassignedTouches: number }
/** The caller must first verify a v2 issuance_enabled snapshot: backend's controlled
 * cutover has paused legacy ingress and selected protocol 2. No unkeyed buffer is sent.
 * Original queues are retained byte-for-byte; receipts are a separate recovery record. */
export async function recoverLegacyQueues(storage: DurableStorage, verifiedIds: readonly string[],
  replay: (pending: { tapCount: number; idempotencyKey: string }) => Promise<"confirmed" | "unavailable">) {
  const outcomes: LegacyResolution[] = [];
  for (const item of inspectLegacyQueues(storage, verifiedIds)) {
    if (item.status === "invalid-preserved" || item.status === "empty") continue;
    const resolutionKey = `${item.key}:v2-recovery`;
    const marker = JSON.stringify([item.pending?.idempotencyKey ?? null, item.pending?.tapCount ?? null, item.unassignedTouches]);
    const saved = storage.getItem(resolutionKey);
    if (saved) {
      try { const prior = JSON.parse(saved); if (prior.marker === marker) { outcomes.push(prior.resolution); continue; } } catch { /* preserve original evidence; replace reconstructible recovery marker only */ }
    }
    const status = item.pending ? await replay(item.pending) : null;
    const resolution: LegacyResolution = { key: item.key, requestKey: item.pending?.idempotencyKey ?? null,
      status: status === "confirmed" ? "receipt-confirmed" : status === "unavailable" ? "receipt-unavailable" : "unkeyed-preserved",
      unassignedTouches: item.unassignedTouches ?? 0 };
    const encoded = JSON.stringify({ marker, resolution });
    storage.setItem(resolutionKey, encoded);
    if (storage.getItem(resolutionKey) !== encoded) throw new Error("Legacy recovery evidence is not durable");
    outcomes.push(resolution);
  }
  return outcomes;
}
