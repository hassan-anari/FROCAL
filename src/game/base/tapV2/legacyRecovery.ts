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
