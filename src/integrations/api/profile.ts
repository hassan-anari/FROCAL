import { z } from "zod";
import { apiRequest } from "./client";

const profileOverviewSchema = z.object({
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

export async function loadProfileOverview(initData: string | null): Promise<ProfileOverview> {
  const response = await apiRequest("/profile/overview", { initData });
  return profileOverviewSchema.parse(await response.json());
}
