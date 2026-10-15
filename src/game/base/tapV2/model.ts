import { z } from "zod";

// Internal read/delivery model, normalized only from the pinned wire contract.
const integer = z.number().int().nonnegative().safe();
export const tapScopeSchema = z.object({
  player: z.string().min(1), season: z.string().min(1), config: z.string().min(1),
  session: z.string().min(1), lease: z.string().min(1),
  generation: integer.positive().optional(),
}).strict();
export type TapScope = z.infer<typeof tapScopeSchema>;
export const scopeId = (scope: TapScope) => JSON.stringify([scope.player, scope.season, scope.config, scope.session, scope.lease, scope.generation ?? 1]);

export const progressionPolicySchema = z.object({
  levels: z.array(z.object({ level: integer.positive(), minimum: integer }).strict()).min(1),
  stages: z.array(z.object({ key: z.enum(["newborn", "explorer", "connector", "specialist", "vanguard", "legend"]), minimumLevel: integer.positive() }).strict()).min(1),
}).strict().superRefine((policy, context) => {
  const validLevels = policy.levels[0].level === 1 && policy.levels[0].minimum === 0
    && policy.levels.every((item, index, items) => index === 0
      || (item.level > items[index - 1].level && item.minimum > items[index - 1].minimum));
  const validStages = policy.stages[0].minimumLevel === 1
    && new Set(policy.stages.map((stage) => stage.key)).size === policy.stages.length
    && policy.stages.every((item, index, items) => index === 0 || item.minimumLevel > items[index - 1].minimumLevel);
  if (!validLevels || !validStages) context.addIssue({ code: "custom", message: "Progression policy must have ordered unique thresholds and a base level/stage" });
});
export type ProgressionPolicy = z.infer<typeof progressionPolicySchema>;

export const grantSchema = z.object({
  scope: tapScopeSchema,
  expiresAt: integer, remaining: integer, sequenceCursor: integer,
  pointsPerTouch: integer.positive(), cooldownDuration: integer.nullable(),
  batchLimit: integer.positive(), progression: progressionPolicySchema,
  minBatchInterval: integer.default(0),
}).strict();
export type TapGrant = z.infer<typeof grantSchema>;

const receiptSchema = z.object({ scope: tapScopeSchema, key: z.string(), receiptId: integer.positive(), through: integer,
  accepted: integer, rejected: integer }).strict();
const rejectionSchema = z.object({ scope: tapScopeSchema, key: z.string(), code: z.string() }).strict();
export const snapshotSchema = z.object({
  player: z.string().min(1), season: z.string().min(1), config: z.string().min(1),
  // Authoritative lexicographic (receipt_cursor, revision) from WEDCAL.
  revision: integer, receiptCursor: integer.default(0), serverTime: integer,
  lifetime: integer, seasonPoints: integer,
  progression: progressionPolicySchema,
  grant: grantSchema.nullable(), cooldownUntil: integer.nullable(),
  receipts: z.array(receiptSchema).default([]), rejections: z.array(rejectionSchema).default([]),
  issuanceEnabled: z.boolean().default(true),
  earningAllowed: z.boolean(),
  ownership: z.object({ status: z.enum(["AVAILABLE", "OWNED", "ANOTHER_DEVICE", "SESSION_MOVED"]),
    generation: integer, activeUntil: integer.nullable(), explicitSwitchRequired: z.boolean() }).optional(),
}).strict().superRefine((snapshot, context) => {
  if (snapshot.grant && (snapshot.grant.scope.player !== snapshot.player
    || snapshot.grant.scope.season !== snapshot.season)) {
    context.addIssue({ code: "custom", message: "Grant and snapshot identity must match" });
  }
  if (snapshot.grant && JSON.stringify(snapshot.grant.progression) !== JSON.stringify(snapshot.progression)) {
    context.addIssue({ code: "custom", message: "Grant must use the current authorized progression policy" });
  }
});
export type TapSnapshot = z.infer<typeof snapshotSchema>;

export const eventSchema = z.object({ scope: tapScopeSchema, sequence: integer.positive() }).strict();
export const batchSchema = z.object({
  scope: tapScopeSchema, key: z.string().min(1).max(100),
  sequences: z.array(integer.positive()).min(1), attempts: integer,
  blocked: z.boolean().default(false),
}).strict();
export type TapBatch = z.infer<typeof batchSchema>;
export type TapSubmission = Pick<TapBatch, "scope" | "key" | "sequences">;
export const journalSchema = z.object({
  version: z.literal(1), player: z.string().min(1),
  session: z.string().nullable().default(null),
  leases: z.array(grantSchema.pick({ scope: true, batchLimit: true, minBatchInterval: true })).max(32).default([]),
  resolved: z.array(z.object({ scope: tapScopeSchema, key: z.string(), code: z.string(), sequences: z.array(integer.positive()) })).max(64).default([]),
  events: z.array(eventSchema).max(1024), batches: z.array(batchSchema).max(1024),
}).strict().superRefine((journal, context) => {
  const events = new Set<string>();
  const assigned = new Set<string>();
  const keys = new Set<string>();
  for (const event of journal.events) {
    const id = `${scopeId(event.scope)}:${event.sequence}`;
    if (event.scope.player !== journal.player || events.has(id)) {
      context.addIssue({ code: "custom", message: "Invalid journal identity or duplicate sequence" });
    }
    events.add(id);
  }
  for (const batch of journal.batches) {
    if (keys.has(batch.key) || batch.scope.player !== journal.player) {
      context.addIssue({ code: "custom", message: "Invalid batch identity or duplicate request key" });
    }
    keys.add(batch.key);
    for (const sequence of batch.sequences) {
      const id = `${scopeId(batch.scope)}:${sequence}`;
      if (!events.has(id) || assigned.has(id)) context.addIssue({ code: "custom", message: "Batch refers to missing or already assigned event" });
      assigned.add(id);
    }
    if (batch.sequences.some((sequence, index, items) => index > 0 && sequence !== items[index - 1] + 1)) {
      context.addIssue({ code: "custom", message: "Microbatch sequences must be contiguous" });
    }
  }
});
export type TapJournal = z.infer<typeof journalSchema>;

export interface TapPort {
  synchronize(journal: Readonly<TapJournal>, signal: AbortSignal): Promise<TapSnapshot>;
  submit(batch: Readonly<TapSubmission>, signal: AbortSignal): Promise<TapSnapshot>;
  switchSession?(journal: Readonly<TapJournal>, generation: number, signal: AbortSignal): Promise<TapSnapshot>;
  releaseSession?(grant: Readonly<TapGrant>, signal: AbortSignal): Promise<void>;
}
// Error mapping is a backend-adapter responsibility; raw HTTP errors never enter UI.
export class TapTransportError extends Error {
  snapshot?: TapSnapshot;
  definitive = false;
  constructor(public readonly kind: "retry" | "rate-limit" | "reauthorize" | "terminal", public readonly retryAfterMs = 0, public readonly code = "TEMPORARY_UNAVAILABLE") {
    super(kind);
  }
}

export function compareSnapshots(a: Pick<TapSnapshot, "receiptCursor" | "revision">, b: Pick<TapSnapshot, "receiptCursor" | "revision">) {
  return a.receiptCursor - b.receiptCursor || a.revision - b.revision;
}
