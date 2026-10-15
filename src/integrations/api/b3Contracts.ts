import { z } from "zod";
const count = z.number().int().nonnegative();
const date = z
  .string()
  .transform((value) => value.replace(" ", "T"))
  .pipe(z.string().datetime({ offset: true }));
export const progressionSchema = z.object({
  lifetime_points: count,
  level: z.number().int().positive(),
  current_threshold: count,
  next_threshold: count.nullable(),
  points_into_level: count,
  points_remaining: count.nullable(),
  dexo_stage: z.enum([
    "newborn",
    "explorer",
    "connector",
    "specialist",
    "vanguard",
    "legend",
  ]),
});
export const canonicalSchema = z.object({
  server_time: date,
  player_id: z.string(),
  season_id: z.string().nullable(),
  config_version: z.string(),
  receipt_cursor: count,
  progression: progressionSchema,
  season_points: count,
});
export type CanonicalState = z.infer<typeof canonicalSchema>;
export const dailySchema = z.object({
  claimable: z.boolean(),
  already_claimed: z.boolean(),
  current_streak: count,
  cycle_day: z.number().int().positive(),
  reward_amount: count,
  reward_cycle: z.array(count),
  period_start: date,
  period_end: date,
  next_reset: date,
  last_claim_time: date.nullable(),
});
export const dailyClaimSchema = z.object({
  created: z.boolean(),
  claim_period: z.string(),
  streak: count,
  cycle_day: count,
  reward_amount: count,
  claimed_at: date,
  daily: dailySchema,
  canonical: canonicalSchema,
});
export const missionSchema = z.object({
  key: z.string().min(1),
  version: count,
  title: z.string(),
  description: z.string(),
  verification_family: z.enum(["INTERNAL", "TELEGRAM", "TIMED_EXTERNAL"]),
  repeat_policy: z.string(),
  reward_amount: count,
  state: z.enum([
    "AVAILABLE",
    "IN_PROGRESS",
    "REWARD_READY",
    "CLAIMED",
    "UNAVAILABLE",
  ]),
  available: z.boolean(),
  unavailable_reason: z.string().nullable(),
  destination_url: z.string().nullable(),
  opened_at: date.nullable(),
  verified_at: date.nullable(),
  claimed_at: date.nullable(),
});
export type Mission = z.infer<typeof missionSchema>;
export const missionStartSchema = z.object({
  key: z.string(),
  version: count,
  state: z.string(),
  open_token: z.string().nullable(),
  destination_url: z.string().nullable(),
  opened_at: date.nullable(),
});
export const missionVerifySchema = z.object({
  key: z.string(),
  version: count,
  state: z.string(),
  verified_at: date.nullable(),
});
export const missionClaimSchema = z.object({
  key: z.string(),
  version: count,
  state: z.string(),
  created: z.boolean(),
  reward_amount: count,
  claimed_at: date.nullable(),
  canonical: canonicalSchema,
});
export const attemptSchema = z.object({
  created: z.boolean(),
  attempt_id: z.string().uuid(),
  phrase_key: z.string(),
  phrase_version: count,
  phrase_text: z.string().min(1).max(4096),
  started_at: date,
  expires_at: date,
  challenge_seconds: z.number().int().positive(),
});
export type Attempt = z.infer<typeof attemptSchema>;
export const typingSchema = z.object({
  attempts_used: count,
  attempts_remaining: count,
  attempt_limit: count,
  next_reset: date,
  claimable_balance: count,
  best_wpm: count,
  best_accuracy_bps: count.max(10000),
  active_attempt: z.string().nullable(),
  active_attempt_detail: attemptSchema.nullable(),
});
export const submitSchema = z.object({
  created: z.boolean(),
  attempt_id: z.string().uuid(),
  status: z.string(),
  accuracy_bps: count.max(10000).nullable(),
  wpm: count.nullable(),
  reward_amount: count,
  typing: typingSchema,
});
export const typingClaimSchema = z.object({
  created: z.boolean(),
  amount: count,
  claimed_at: date,
  typing: typingSchema,
  canonical: canonicalSchema,
});
const tierSchema = z.object({
  key: z.string(),
  min_verified_referrals: count,
  share_bps: count.max(10000),
});
const eligibilitySchema = z.object({
  level: count,
  required_level: count,
  required_account_age_hours: count,
  eligible: z.boolean(),
});
export const referralSchema = z.object({
  code: z.string(),
  link: z.string().nullable(),
  pending_count: count,
  verified_count: count,
  current_tier: z.string().nullable(),
  current_share_bps: count,
  next_tier: tierSchema.nullable(),
  tiers: z.array(tierSchema),
  enabled: z.boolean(),
  earned_points: count,
  attribution_status: z.string().nullable(),
  activation: eligibilitySchema.nullable(),
  inviter_bonus: count,
  invitee_bonus: count,
});
export const inviteesSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      status: z.string(),
      attributed_at: date,
      verified_at: date.nullable(),
      activation: eligibilitySchema,
    }),
  ),
  next_offset: count.nullable(),
});
export const networkSchema = z.object({
  canonical: canonicalSchema,
  enabled: z.boolean(),
  active_groups: count,
  group_count: count,
  max_active_groups: count,
  can_register: z.boolean(),
  speaker_rewards_enabled: z.boolean(),
  earned_points: count,
  settlement_window_seconds: count,
});
export const groupsSchema = z.object({
  items: z.array(
    z.object({
      public_id: z.string().uuid(),
      title: z.string(),
      state: z.string(),
      bot_admin: z.boolean(),
      broadcast_opted_in: z.boolean(),
      creator_verified_at: date.nullable(),
      bot_verified_at: date.nullable(),
      next_verification_at: date,
      verification_retrying: z.boolean(),
      earned_points: count,
      qualified_characters: count,
      unique_speakers: count,
      last_activity_at: date.nullable(),
    }),
  ),
  next_offset: count.nullable(),
});
export const intentSchema = z.object({
  startgroup_url: z.string(),
  expires_at: date,
});
export const bannerSchema = z.object({
  placement: z.literal("BASE"),
  banner: z
    .object({
      id: z.string().uuid(),
      image_url: z.string(),
      alt_text: z.string(),
      destination: z.string().nullable(),
      destination_type: z.enum(["TELEGRAM", "HTTPS"]).nullable(),
      width: z.literal(1200),
      height: z.literal(260),
      version: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .nullable(),
});
