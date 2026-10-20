import { z } from "zod";
import { canonicalSchema } from "./b3Contracts";

const dexoStageSchema = z.enum([
  "newborn", "explorer", "connector", "specialist", "vanguard", "legend",
]);

export const bootstrapProgressionPolicySchema = z.object({
  levels: z.array(z.object({
    level: z.number().int().positive(),
    min_lifetime_points: z.number().int().nonnegative(),
  })),
  dexo_stages: z.array(z.object({ key: z.string().min(1), min_level: z.number().int().positive() })),
  clan_min_level: z.number().int().positive().nullable(),
});
export type BootstrapProgressionPolicy = z.infer<typeof bootstrapProgressionPolicySchema>;

export const bootstrapFeaturesSchema = z.object({
  season: z.boolean(), daily: z.boolean(), typing: z.boolean(), missions: z.boolean(),
  referral: z.boolean(), network: z.boolean(), base_tap: z.boolean(), clan: z.boolean(),
  profile: z.boolean(), arena: z.boolean(),
});
export const bootstrapGameplaySchema = z.object({
  moderation_state: z.enum(["ACTIVE", "FLAGGED", "SUSPENDED", "BANNED"]),
  reward_earning_allowed: z.boolean(),
});

export const seasonTimingSchema = z.object({
  product_period_days: z.number().int().positive(),
  epoch_count: z.number().int().positive(),
  epoch_days: z.number().int().positive(),
  closing_days: z.number().int().nonnegative(),
  economic_ends_at: z.string().datetime({ offset: true }),
  settlement_start_epoch: z.number().int().positive(),
}).refine(t => t.product_period_days === t.epoch_count * t.epoch_days + t.closing_days
  && t.settlement_start_epoch <= t.epoch_count, "Inconsistent Season timing");

// PR #26 / cadc257: additions are optional only to support the deployed legacy API.
// When an additive object is present, validate all of its reviewed schema fields.
export const remoteBootstrapSchema = z.object({
  canonical: canonicalSchema.nullish(),
  contract_version: z.literal("1.1").optional(),
  request_id: z.string().regex(/^[A-Za-z0-9._-]{1,64}$/).optional(),
  server_time: z.string().datetime({ offset: true }).optional(),
  player: z.object({
    id: z.string().min(1).optional(),
    telegram_user_id: z.number().int().positive(),
    first_name: z.string(), last_name: z.string(), username: z.string(),
    language_code: z.string().optional(), photo_url: z.string().optional(),
  }),
  progression: z.object({
    lifetime_points: z.number().int().nonnegative(), level: z.number().int().positive(),
    current_threshold: z.number().int().nonnegative(), next_threshold: z.number().int().positive().nullable(),
    points_into_level: z.number().int().nonnegative(), points_remaining: z.number().int().nonnegative().nullable(),
    dexo_stage: dexoStageSchema,
  }),
  season: z.object({
    code: z.string(), title: z.string(), status: z.string(), starts_at: z.string(), ends_at: z.string(),
    season_points: z.number().int().nonnegative(),
    timing: seasonTimingSchema.nullish(),
  }).refine(season => {
    if (!season.timing) return true;
    const start = Date.parse(season.starts_at), end = Date.parse(season.ends_at);
    const economicEnd = Date.parse(season.timing.economic_ends_at);
    return end - start === season.timing.product_period_days * 86_400_000
      && economicEnd - start === season.timing.epoch_count * season.timing.epoch_days * 86_400_000;
  }, "Season dates do not match pinned timing").nullable(),
  config: z.object({
    version: z.string(), effective_at: z.string(),
    schema_version: z.number().int().positive().optional(), payload_checksum: z.string().optional(),
    progression: bootstrapProgressionPolicySchema.optional(),
  }).passthrough(),
  features: bootstrapFeaturesSchema.optional(),
  gameplay: bootstrapGameplaySchema.optional(),
  daily: z.object({ claimable: z.boolean(), streak: z.number().int().nonnegative(), cycle_day: z.number().int().positive(), reward_amount: z.number().int().nonnegative(), next_reset: z.string() }).passthrough().nullable(),
  typing: z.object({ attempts_used: z.number().int().nonnegative(), attempts_remaining: z.number().int().nonnegative(), claimable_balance: z.number().int().nonnegative() }).passthrough().nullable(),
  missions: z.object({ available_count: z.number().int().nonnegative(), reward_ready_count: z.number().int().nonnegative(), unclaimed_count: z.number().int().nonnegative() }).passthrough().nullable(),
  referral: z.object({ status: z.string().nullable(), verified_invites: z.number().int().nonnegative() }).passthrough().nullable(),
  network: z.object({ group_count: z.number().int().nonnegative(), active_group_count: z.number().int().nonnegative() }).passthrough().nullable(),
});
export type RemoteBootstrap = z.infer<typeof remoteBootstrapSchema>;

/** Metadata is retained as a server string; only HTTP(S) photos enter image slots. */
export function profilePhotoUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  try { const url = new URL(photo); return ["https:", "http:"].includes(url.protocol) ? photo : null; }
  catch { return null; }
}

export function configCacheScope(config: RemoteBootstrap["config"]): string {
  return config.payload_checksum === undefined && config.schema_version === undefined
    ? config.version
    : JSON.stringify([config.version, config.schema_version ?? null, config.payload_checksum ?? null]);
}
