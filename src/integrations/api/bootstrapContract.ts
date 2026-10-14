import { z } from "zod";

const dexoStageSchema = z.enum([
  "newborn",
  "explorer",
  "connector",
  "specialist",
  "vanguard",
  "legend",
]);

export const remoteBootstrapSchema = z.object({
  player: z.object({
    telegram_user_id: z.number().int(),
    first_name: z.string(),
    last_name: z.string(),
    username: z.string(),
  }),
  progression: z.object({
    lifetime_points: z.number().int().nonnegative(),
    level: z.number().int().positive(),
    current_threshold: z.number().int().nonnegative(),
    next_threshold: z.number().int().positive().nullable(),
    points_into_level: z.number().int().nonnegative(),
    points_remaining: z.number().int().nonnegative().nullable(),
    dexo_stage: dexoStageSchema,
  }),
  season: z
    .object({
      code: z.string(),
      title: z.string(),
      status: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      season_points: z.number().int().nonnegative(),
    })
    .nullable(),
  config: z.object({
    version: z.string(),
    effective_at: z.string(),
  }).passthrough(),
  daily: z.object({ claimable: z.boolean(), streak: z.number().int().nonnegative(), cycle_day: z.number().int().positive(), reward_amount: z.number().int().nonnegative(), next_reset: z.string() }).passthrough().nullable(),
  typing: z.object({ attempts_used: z.number().int().nonnegative(), attempts_remaining: z.number().int().nonnegative(), claimable_balance: z.number().int().nonnegative() }).passthrough().nullable(),
  missions: z.object({ available_count: z.number().int().nonnegative(), reward_ready_count: z.number().int().nonnegative(), unclaimed_count: z.number().int().nonnegative() }).passthrough().nullable(),
  referral: z.object({ status: z.string().nullable(), verified_invites: z.number().int().nonnegative() }).passthrough().nullable(),
  network: z.object({ group_count: z.number().int().nonnegative(), active_group_count: z.number().int().nonnegative() }).passthrough().nullable(),
});

export type RemoteBootstrap = z.infer<typeof remoteBootstrapSchema>;

