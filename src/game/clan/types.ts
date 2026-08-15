import type { AssetKey } from "@/assets/registry";

export type ClanRole = "captain" | "soldier";
export type ClanMembershipStatus = "none" | "pending" | "member";
export type JoinRequestState = "none" | "pending" | "rejected";
export type SoldierClanTab = "discover" | "search" | "ranking";
export type HeadquartersTab = "home" | "tasks" | "members" | "inventory";
export type TaskFilter = "active" | "completed";
export type ClanTaskType = "group" | "individual";
export type ClanTaskStatus = "active" | "completed";
export type ClanInventoryMode = "owned" | "shop";

export interface ClanSummary {
  id: string;
  name: string;
  tag: string;
  level: number;
  members: number;
  capacity: number;
  rank: number;
  score: number;
  status: "Recruiting" | "Focused" | "Full";
  summary: string;
  accent: "cyan" | "violet" | "gold" | "blue";
  imageUrl?: string | null;
  fresh?: boolean;
  match?: number;
}

export interface ClanMember {
  id: string;
  name: string;
  level: number;
  contribution: number;
  role: "Captain" | "Soldier";
  initial: string;
  avatarUrl?: string | null;
}

export interface ClanTask {
  id: string;
  title: string;
  description: string;
  type: ClanTaskType;
  status: ClanTaskStatus;
  current: number;
  target: number;
  unit: string;
  rewardLabel: string;
  timeLabel: string;
}

export interface ClanAchievement {
  id: string;
  name: string;
  description: string;
  current: number;
  target: number;
  unlocked: boolean;
}

export interface ClanInventoryItem {
  id: string;
  name: string;
  description: string;
  effect: string;
  price: number;
  glyph: string;
  rarity: "Core" | "Rare" | "Epic";
  kind: "Booster" | "Defence" | "Utility";
  artKey: AssetKey;
}

export interface ClanJoinApplicant {
  id: string;
  name: string;
  username: string | null;
  level: number;
  seasonScore: number;
  globalRank: number;
  activeDays: number;
  contributionPreview: number;
  medals: string[];
  initial: string;
  avatarUrl?: string | null;
  status: "pending" | "accepted" | "rejected";
}

export interface ClanEligibleGroup {
  id: string;
  title: string;
  username: string | null;
  memberCount: number;
  botIsAdmin: boolean;
  userIsAdmin: boolean;
  userIsOwner: boolean;
  photoUrl?: string | null;
}

export interface CreatedClan {
  name: string;
  tag: string;
  motto: string;
  accent: ClanSummary["accent"];
  telegramGroupId: string;
  telegramGroupTitle: string;
  telegramGroupUsername: string | null;
  telegramGroupPhotoUrl?: string | null;
}
