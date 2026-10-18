import type * as c from "./b6Schemas";
import { clanAchievements, clanShopItems } from "@/game/clan/clanCatalog";
import type { ClanAchievement, ClanInventoryItem, ClanJoinApplicant, ClanMember, ClanSummary, ClanTask } from "@/game/clan/types";
export const clanSummary = (row: c.ClanOut): ClanSummary => ({ id: String(row.id), name: row.name, tag: row.tag, summary: row.motto, level: row.level ?? 0, members: row.member_count, capacity: row.capacity, rank: row.rank_status === "RANKED" ? row.rank ?? null : null, rankStatus: row.rank_status ?? "UNAVAILABLE", score: row.score ?? 0, status: !row.accepting_members || row.member_count >= row.capacity ? "Full" : "Recruiting", accent: "cyan", imageUrl: row.image_url, hqState: row.state === "RECOVERY" ? "recovery" : "normal" });
export const clanMember = (row: c.RosterMemberOut): ClanMember => ({ id: String(row.membership_id), name: row.first_name || row.username, level: row.level, contribution: row.contribution, role: row.role === "CAPTAIN" ? "Captain" : "Soldier", initial: row.first_name.slice(0, 1), avatarUrl: row.avatar_url });
export const clanApplicant = (row: c.ApplicantOut): ClanJoinApplicant => ({ id: String(row.request_id), name: row.first_name, username: row.username || null, level: row.level, seasonScore: row.season_points, globalRank: row.rank_status === "RANKED" ? row.rank ?? null : null, rankStatus: row.rank_status ?? "UNAVAILABLE", currentStreak: row.current_streak ?? null, contributionPreview: null, medals: [], initial: row.first_name.slice(0, 1), status: row.state === "PENDING" ? "pending" : row.state === "DECLINED" ? "rejected" : "accepted" });
function effectLabel(effect: c.EffectRuleOut): string {
  const percent = `${effect.value / 100}%`;
  switch (effect.category) {
    case "HQ_XP_RATE_BONUS_BPS": return `+${percent} HQ XP generation`;
    case "CONTRIBUTION_RATE_BONUS_BPS": return `+${percent} contribution`;
    case "CLAN_MISSION_PROGRESS_BONUS_BPS": return `+${percent} Clan mission progress`;
    case "SEASON_CAPACITY_ADD": return `+${effect.value} Clan capacity this Season`;
    case "HQ_XP_GRANT": return `+${effect.value.toLocaleString("en-US")} HQ XP`;
    default: return "Effect details unavailable";
  }
}
export function clanItem(row: c.ItemRuleOut): ClanInventoryItem | null {
  const art = clanShopItems.find(item => item.id === row.item_id);
  if (!art) return null;
  return { ...art, name: row.name, price: row.price, activationMode: row.activation === "TIMED" ? "timed" : "context", durationMinutes: row.duration_minutes ?? undefined, effect: row.effects.map(effectLabel).join(" · "), contextLabel: row.activation === "TIMED" ? undefined : "Use", description: art.description };
}
export function clanMission(row: c.ClanMissionOut): ClanTask {
  const rewardState = ({ SETTLED: "Settled", PAID: "Settled", PENDING: "Pending", NOT_PARTICIPATING: "No participant reward", INELIGIBLE: "Not eligible for a reward", NOT_COMPLETED: "In progress", IN_PROGRESS: "In progress", UNAVAILABLE: "Unavailable" } as Record<string, string>)[row.reward_state] ?? "Reward status unavailable";
  return { id: `${row.key}:${row.version}`, title: row.title?.trim() || "Clan mission", description: row.description?.trim() || (row.availability === "UNAVAILABLE" ? "This mission is unavailable." : "Mission details are unavailable."), type: row.kind === "GROUP" ? "group" : "individual", status: row.completed ? "completed" : "active", current: row.progress_units, target: row.target_units, unit: ({ VALID_CLAN_ACTIVITY: "activities", CLAN_CONTRIBUTION: "contribution", VALID_TYPING_RUN: "runs" } as Record<string, string>)[row.requirement] ?? "units", rewardLabel: row.availability === "UNAVAILABLE" ? "Unavailable" : row.own_player_reward !== null ? `${row.own_player_reward} XP · ${rewardState}` : row.participant_gross_points !== null ? `${row.participant_gross_points.toLocaleString()} gross points${row.direct_hq_xp !== null ? ` · ${row.direct_hq_xp.toLocaleString()} HQ XP` : ""} · ${row.reward_band.toLowerCase()} band` : rewardState, timeLabel: new Date(row.ends_at).toLocaleString("en-US") };
}
export function clanItemBlockedLabel(reason: string | null | undefined, insufficient: boolean) {
  if (insufficient) return "Insufficient Treasury";
  return ({ CAPTAIN_OR_CLAN_STATE_REQUIRED: "Requires active Captain access", NOT_OWNED: "Not in Clan inventory", SEASON_USE_LIMIT: "Season use limit reached", CAPACITY_LIMIT: "Clan capacity limit reached" } as Record<string, string>)[reason ?? ""] ?? "Unavailable";
}
export function clanTrophy(row: c.TrophyOut): ClanAchievement {
  const editorial = clanAchievements.find(item => item.id === row.key);
  return { id: row.key, name: editorial?.name ?? row.key.replaceAll("-", " "), description: editorial?.description ?? "", current: row.available ? row.current : null, target: row.available ? row.target : null, unlocked: row.unlocked, available: row.available };
}

/** Effects counts effect rows; facilities counts distinct currently effective timed items. */
export function clanEquipmentMetrics(equipment: c.EquipmentOut, now: number) {
  const timed = new Map(equipment.items.filter(item => item.activation === "TIMED").map(item => [item.item_id, item]));
  const effects = equipment.active_effects.filter(effect => timed.has(effect.item_id) && effect.effective && Date.parse(effect.starts_at) <= now && Date.parse(effect.expires_at) > now);
  const activeItems = [...new Set(effects.map(effect => effect.item_id))];
  const quantity = equipment.items.reduce((total, item) => total + item.quantity, 0);
  const first = activeItems[0];
  return { facilities: first ? `${timed.get(first)!.name}${activeItems.length > 1 ? ` +${activeItems.length - 1}` : ""}` : `${quantity} items`, effects: effects.length };
}
