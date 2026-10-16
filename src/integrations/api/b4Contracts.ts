import { z } from "zod";
import * as b3 from "./b3Contracts";
export * from "./b3Contracts";

const count = z.number().int().nonnegative();
export const confirmedRewardSchema = z.object({
  event_id: z.string().min(1), amount: count, ledger_ids: z.array(z.number().int().positive()),
  source: z.string(), created: z.boolean(),
  progression_before: b3.progressionSchema, progression_after: b3.progressionSchema,
});
export type ConfirmedReward = z.infer<typeof confirmedRewardSchema>;
// Absence supports the separately pinned historical B3 compatibility backend.
// B4's explicit null means no settled ledger and never creates presentation.
const receipt = { reward: confirmedRewardSchema.nullable().optional() };
export const dailyClaimSchema = b3.dailyClaimSchema.extend(receipt);
export const missionClaimSchema = b3.missionClaimSchema.extend(receipt);
export const typingClaimSchema = b3.typingClaimSchema.extend(receipt);
export const submitSchema = b3.submitSchema.extend({ score: count.nullable().optional() });
export const inviteesSchema = b3.inviteesSchema.extend({ items: z.array(b3.inviteesSchema.shape.items.element.extend({ photo_url: z.string().optional() })) });
export const groupsSchema = b3.groupsSchema.extend({ items: z.array(b3.groupsSchema.shape.items.element.extend({ photo_url: z.string().optional() })) });
export const typingRunSchema = z.object({
  attempt_id: z.string().uuid(), status: z.string(), started_at: z.string(), submitted_at: z.string(),
  accuracy_bps: count.max(10000).nullable(), wpm: count.nullable(), score: count.nullable(),
  reward_amount: count, season: z.string(), config_version: z.string(), claimed: z.boolean(),
});
export const typingHistorySchema = z.object({ items: z.array(typingRunSchema), next_cursor: z.number().int().positive().nullable() });
