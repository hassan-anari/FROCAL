import type * as c from "./b5Schemas";
import { clanAchievements, clanShopItems, clanTasks } from "@/game/clan/clanCatalog";
import type { ClanAchievement, ClanInventoryItem, ClanJoinApplicant, ClanMember, ClanSummary, ClanTask } from "@/game/clan/types";
export const clanSummary = (row: c.ClanOut): ClanSummary => ({ id: String(row.id), name: row.name, tag: row.tag, summary: row.motto, level: row.level ?? 0, members: row.member_count, capacity: row.capacity, rank: row.rank ?? null, score: row.score ?? 0, status: !row.accepting_members || row.member_count >= row.capacity ? "Full" : "Recruiting", accent: "cyan", imageUrl: row.image_url, hqState: row.state === "RECOVERY" ? "recovery" : "normal" });
export const clanMember = (row: c.RosterMemberOut): ClanMember => ({ id: String(row.membership_id), name: row.first_name || row.username, level: row.level, contribution: row.contribution, role: row.role === "CAPTAIN" ? "Captain" : "Soldier", initial: row.first_name.slice(0, 1), avatarUrl: row.avatar_url });
export const clanApplicant = (row: c.ApplicantOut): ClanJoinApplicant => ({ id: String(row.request_id), name: row.first_name, username: row.username || null, level: row.level, seasonScore: row.season_points, globalRank: null, activeDays: null, contributionPreview: null, medals: [], initial: row.first_name.slice(0, 1), status: row.state === "PENDING" ? "pending" : row.state === "DECLINED" ? "rejected" : "accepted" });
export function clanItem(row: c.ItemRuleOut): ClanInventoryItem | null {
  const art = clanShopItems.find(item => item.id === row.item_id);
  if (!art) return null;
  return { ...art, name: row.name, price: row.price, activationMode: row.activation === "TIMED" ? "timed" : "context", durationMinutes: row.duration_minutes ?? undefined, effect: row.effects.map(effect => `${effect.category.replaceAll("_", " ")}: ${effect.value}`).join(" · "), contextLabel: row.activation === "TIMED" ? undefined : "Use", description: art.description };
}
export function clanMission(row: c.ClanMissionOut): ClanTask {
  const editorial = clanTasks.find(task => task.id === row.key);
  return { id: row.key, title: editorial?.title ?? row.key.replaceAll("-", " "), description: editorial?.description ?? row.requirement.replaceAll("_", " "), type: row.kind === "GROUP" ? "group" : "individual", status: row.completed ? "completed" : "active", current: row.progress_units, target: row.target_units, unit: editorial?.unit ?? "units", rewardLabel: row.availability === "UNAVAILABLE" ? "Unavailable" : row.own_player_reward !== null ? `${row.own_player_reward} XP · ${row.reward_state.replaceAll("_", " ")}` : row.participant_gross_points !== null ? `${row.participant_gross_points} gross points` : row.reward_state.replaceAll("_", " "), timeLabel: new Date(row.ends_at).toLocaleString("en-US") };
}
export function clanTrophy(row: c.TrophyOut): ClanAchievement {
  const editorial = clanAchievements.find(item => item.id === row.key);
  return { id: row.key, name: editorial?.name ?? row.key.replaceAll("-", " "), description: editorial?.description ?? "", current: row.available ? row.current : null, target: row.available ? row.target : null, unlocked: row.unlocked, available: row.available };
}
