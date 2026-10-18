import { z } from "zod";
import type { EarnHistoryEntry } from "@/game/earn/types";
import { apiRequest, ApiError } from "./client";

// WEDCAL apps/rewards/api.py HistoryItem/HistoryOutput. Amounts are signed ledger values.
export const rewardHistorySchema = z.object({
  items: z.array(z.object({
    id: z.number().int().positive().safe(), source_type: z.string().min(1), context: z.string(),
    player_amount: z.number().int().safe(), occurred_at: z.iso.datetime({ offset: true }),
  })),
  next_cursor: z.number().int().positive().safe().nullable(),
});
export type RewardHistoryPage = z.infer<typeof rewardHistorySchema>;
export type RewardHistoryItem = RewardHistoryPage["items"][number];
export async function loadRewardHistory(initData: string | null, cursor: number | null, signal?: AbortSignal, category?: "network"): Promise<RewardHistoryPage> {
  const response = await apiRequest(`/rewards/history?limit=20${category === "network" ? "&category=network" : ""}${cursor === null ? "" : `&cursor=${cursor}`}`, { initData, signal, cache: "no-store" });
  const result = rewardHistorySchema.safeParse(await response.json());
  if (!result.success || (category === "network" && result.data.items.some(item => item.source_type !== "CREATOR" && item.source_type !== "NETWORK_SPEAKER"))) throw new ApiError(0, "RESPONSE_INVALID");
  return result.data;
}
export function historyRows(pages: readonly RewardHistoryPage[] | undefined): RewardHistoryItem[] {
  const seen = new Set<number>();
  return (pages ?? []).flatMap(page => page.items).filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id); return true;
  });
}
function category(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ");
}
export function rewardHistoryView(item: RewardHistoryItem): EarnHistoryEntry {
  const source = item.source_type.toLowerCase();
  const type: EarnHistoryEntry["type"] = source.includes("daily") ? "daily" : source.includes("mission") ? "mission" : source.includes("typing") ? "typing" : source.includes("referral") ? "referral" : source.includes("network") || source.includes("creator") || source.includes("clan") ? "group" : "system";
  return { id: String(item.id), type, title: category(item.source_type), description: category(item.context), xp: item.player_amount, createdAt: item.occurred_at };
}
export function formatXp(amount: number): string { return `${amount > 0 ? "+" : ""}${amount} XP`; }
export function rewardTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}
