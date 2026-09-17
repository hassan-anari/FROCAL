import { z } from "zod";
import { apiRequest } from "./client";

const missionStateSchema = z.enum(["AVAILABLE", "IN_PROGRESS", "REWARD_READY", "CLAIMED"]);

const missionSchema = z.object({
  key: z.string(),
  version: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  verification_family: z.string(),
  repeat_policy: z.string(),
  reward_amount: z.number().int().nonnegative(),
  state: missionStateSchema,
});

const dailyStateSchema = z.object({
  claimable: z.boolean(),
  already_claimed: z.boolean(),
  current_streak: z.number().int().nonnegative(),
  cycle_day: z.number().int().positive(),
  reward_amount: z.number().int().nonnegative(),
  period_start: z.string(),
  period_end: z.string(),
  next_reset: z.string(),
  last_claim_time: z.string().nullable(),
});

const rewardHistoryItemSchema = z.object({
  id: z.number().int().positive(),
  source_type: z.string(),
  context: z.string(),
  player_amount: z.number().int().positive(),
  occurred_at: z.string(),
});

const rewardHistorySchema = z.object({
  items: z.array(rewardHistoryItemSchema),
  next_cursor: z.number().int().nullable(),
});

const clanStateSchema = z.object({
  enabled: z.boolean(),
  eligible: z.boolean(),
  role: z.string().nullable(),
  cooldown_until: z.string().nullable(),
  voluntary_leave_count: z.number().int().nonnegative(),
});

export type BaseMission = z.infer<typeof missionSchema>;
export type DailyState = z.infer<typeof dailyStateSchema>;
export type RewardHistoryItem = z.infer<typeof rewardHistoryItemSchema>;
export type RewardHistory = z.infer<typeof rewardHistorySchema>;
export type ClanState = z.infer<typeof clanStateSchema>;

export async function loadMissions(initData: string | null): Promise<BaseMission[]> {
  const response = await apiRequest("/missions", { initData });
  return z.array(missionSchema).parse(await response.json());
}

export async function loadDailyState(initData: string | null): Promise<DailyState> {
  const response = await apiRequest("/daily", { initData });
  return dailyStateSchema.parse(await response.json());
}

export async function loadRewardHistory(
  initData: string | null,
  limit = 3,
): Promise<RewardHistory> {
  const response = await apiRequest(`/rewards/history?limit=${limit}`, { initData });
  return rewardHistorySchema.parse(await response.json());
}

export async function loadClanState(initData: string | null): Promise<ClanState> {
  const response = await apiRequest("/clans/state", { initData });
  return clanStateSchema.parse(await response.json());
}
