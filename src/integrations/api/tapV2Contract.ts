import { z } from "zod";
import { bootstrapProgressionPolicySchema } from "./bootstrapContract";

// WEDCAL PR #27 / 34328c7. Exact source provenance lives in contracts/b2-pin.json.
const count = z.number().int().nonnegative().safe();
export const tapProgressionSchema = z.object({
  lifetime_points: count, level: count.positive(), current_threshold: count,
  next_threshold: count.positive().nullable(), points_into_level: count,
  points_remaining: count.nullable(),
  dexo_stage: z.enum(["newborn", "explorer", "connector", "specialist", "vanguard", "legend"]),
});
export const tapLeaseSchema = z.object({
  lease_id: z.uuid(), session_id: z.uuid(), generation: count.positive(),
  authorized_allowance: count, reward_per_tap: count.positive(), max_taps_per_batch: count.positive(),
  cooldown_seconds: count.positive(), min_batch_interval_ms: count, expires_at: z.iso.datetime({ offset: true }),
  sequence_start: count.positive(), sequence_end: count,
  config_version: z.string().min(1), season_id: z.string().min(1),
});
export const tapStateSchema = z.object({
  contract_version: z.literal("2.0"), server_time: z.iso.datetime({ offset: true }),
  player_id: z.string().min(1), season_id: z.string().nullable(), config_version: z.string().min(1),
  issuance_enabled: z.boolean(), reward_earning_allowed: z.boolean(),
  revision: count, generation: count, receipt_cursor: count, burst_remaining: count,
  cooldown_until: z.iso.datetime({ offset: true }).nullable(), lease: tapLeaseSchema.nullable(),
  progression: tapProgressionSchema, season_points: count, progression_policy: bootstrapProgressionPolicySchema,
  // B3 additive ownership contract; omission keeps deployed B2 clients compatible.
  ownership: z.object({ status: z.enum(["AVAILABLE", "OWNED", "ANOTHER_DEVICE", "SESSION_MOVED"]),
    active_until: z.iso.datetime({ offset: true }).nullable(), explicit_switch_required: z.boolean() }).optional(),
});
export const tapBatchInputSchema = z.object({
  lease_id: z.uuid(), session_id: z.uuid(), generation: count.positive(),
  sequence_start: count.positive().max(1001), tap_count: count.positive().max(1000),
  idempotency_key: z.string().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/),
}).strict();
export const tapReceiptSchema = z.object({
  receipt_id: count.positive(), idempotency_key: z.string().min(1).max(80),
  lease_id: z.uuid(), session_id: z.uuid(), generation: count.positive(),
  sequence_start: count.positive(), requested_taps: count.positive(), sequence_through: count,
  accepted_taps: count, rejected_taps: count, earned_points: count,
  accepted_at: z.iso.datetime({ offset: true }), season_id: z.string().min(1), config_version: z.string().min(1),
});
export const tapBatchResultSchema = z.object({
  duplicate: z.boolean(), accepted_taps: count, rejected_taps: count, earned_points: count,
  receipt_id: count.positive(), sequence_through: count, snapshot: tapStateSchema, receipt: tapReceiptSchema,
});
export const tapErrorCodeSchema = z.enum([
  "AUTH_MISSING", "AUTH_INVALID", "AUTH_EXPIRED", "AUTH_UNAVAILABLE", "PLAYER_RESTRICTED", "LEASE_UNKNOWN",
  "ACTIVE_SESSION", "GENERATION_STALE", "LEASE_REVOKED", "LEASE_EXPIRED", "ALLOWANCE_EXHAUSTED", "SEQUENCE_REPLAY",
  "IDEMPOTENCY_CONFLICT", "SEASON_CHANGED", "SEASON_UNAVAILABLE", "SEASON_FINALIZED", "EPOCH_FINALIZED", "COOLDOWN",
  "SEQUENCE_GAP", "REQUEST_INVALID", "BATCH_TOO_LARGE", "RATE_LIMITED", "ISSUANCE_DISABLED", "LEGACY_DRAIN_REQUIRED",
  "CONFIG_UNAVAILABLE", "TEMPORARY_UNAVAILABLE",
]);
export const tapErrorSchema = z.object({
  code: tapErrorCodeSchema, detail: z.string(), retryable: z.boolean().optional(),
  retry_after_ms: count.nullable().optional(), snapshot: tapStateSchema.nullable().optional(),
});
export type WireTapState = z.infer<typeof tapStateSchema>;
export type WireTapBatch = z.infer<typeof tapBatchInputSchema>;
export type WireTapResult = z.infer<typeof tapBatchResultSchema>;
export type TapErrorCode = z.infer<typeof tapErrorCodeSchema>;
