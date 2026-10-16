import { z } from "zod";
import { canonicalSchema } from "./b3Contracts";
import { apiRequest } from "./client";

export const profileOverviewSchema = z.object({
  canonical: canonicalSchema.nullish(),
  identity: z.object({
    first_name: z.string(),
    last_name: z.string(),
    username: z.string(),
    photo_url: z.string(),
  }),
  progression: z.object({
    lifetime_points: z.number().int().nonnegative(),
    level: z.number().int().positive(),
    current_threshold: z.number().int().nonnegative(),
    next_threshold: z.number().int().positive().nullable(),
    points_into_level: z.number().int().nonnegative(),
    points_remaining: z.number().int().nonnegative().nullable(),
    dexo_stage: z.enum([
      "newborn",
      "explorer",
      "connector",
      "specialist",
      "vanguard",
      "legend",
    ]),
  }),
  journey: z.object({
    claimed_missions: z.number().int().nonnegative(),
    current_daily_streak: z.number().int().nonnegative(),
    verified_referrals: z.number().int().nonnegative(),
  }),
  customization: z.object({
    active_frame: z.string(),
    active_title: z.string(),
    featured_medal: z.string().nullable(),
    featured_achievement: z.string().nullable(),
  }),
});

export type ProfileOverview = z.infer<typeof profileOverviewSchema>;

const count = z.number().int().nonnegative();
export const achievementsSchema = z.object({
  achievements: z.array(z.object({ key: z.string(), available_s1: z.boolean(), unlocked: z.boolean(), unlocked_at: z.string().nullable(), current_progress: count, target: count, point_reward: count })),
  unlocked_count: count,
});
const collectionItem = z.object({ key: z.string(), available: z.boolean(), entitled: z.boolean(), active: z.boolean() });
export const collectionSchema = z.object({
  frames: z.array(collectionItem), titles: z.array(collectionItem),
  medals: z.array(z.object({ key: z.string(), group: z.enum(["SEASON", "CAREER"]), owned: z.boolean(), featured: z.boolean(), awarded_at: z.string().nullable(), source_season: z.string().nullable() })),
  owned_medal_count: count,
});
export type Customization = ProfileOverview["customization"];
export async function loadAchievements(signal?: AbortSignal) {
  const response = await apiRequest("/profile/achievements", { signal, cache: "no-store" });
  return achievementsSchema.parse(await response.json());
}
export async function loadCollection(signal?: AbortSignal) {
  const response = await apiRequest("/profile/collection", { signal, cache: "no-store" });
  return collectionSchema.parse(await response.json());
}
export async function saveCustomization(input: Customization) {
  const response = await apiRequest("/profile/customization", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  return profileOverviewSchema.shape.customization.parse(await response.json());
}

export async function loadProfileOverview(initData: string | null): Promise<ProfileOverview> {
  const response = await apiRequest("/profile/overview", { initData });
  return profileOverviewSchema.parse(await response.json());
}

export async function reviewProfile() {
  const response = await apiRequest("/profile/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  return profileOverviewSchema.shape.customization.parse(await response.json());
}
