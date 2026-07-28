import type { AssetKey } from "@/assets/registry";

export type ProfileTab = "overview" | "achievements" | "collection";
export type CollectionTab = "frames" | "medals" | "titles";
export type AchievementCategory = "journey" | "community" | "clan-war";
export type Rarity = "core" | "rare" | "epic" | "legendary";

export type FrameId = "standard" | "premium" | "seasonal" | "founder" | "clan" | "captain";
export type TitleId = "explorer" | "early-pioneer" | "mission-runner" | "network-builder" | "community-voice" | "season-veteran";
export type AchievementId =
  | "first-mission"
  | "first-referral"
  | "seven-day-streak"
  | "thirty-day-streak"
  | "first-verified-activity"
  | "clan-ready"
  | "first-clan"
  | "first-contribution"
  | "first-war"
  | "first-victory";
export type MedalId =
  | "season-founding"
  | "season-participant"
  | "season-veteran"
  | "season-top-10"
  | "season-top-1"
  | "season-champion"
  | "activity-veteran"
  | "clan-loyalty"
  | "leadership"
  | "mission-master";

export interface ProfileFrame {
  id: FrameId;
  name: string;
  description: string;
  unlockHint: string;
  asset: AssetKey;
  rarity: Rarity;
  availableNow: boolean;
}

export interface ProfileTitle {
  id: TitleId;
  name: string;
  description: string;
  unlockHint: string;
  rarity: Rarity;
}

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  progressLabel: string;
  category: AchievementCategory;
  asset: AssetKey;
  rewardXp: number;
  target: number;
  availableNow: boolean;
}

export interface MedalDefinition {
  id: MedalId;
  name: string;
  description: string;
  unlockHint: string;
  group: "season" | "career";
  asset: AssetKey;
  rarity: Rarity;
}

export interface AchievementProgress {
  current: number;
  target: number;
  secondaryCurrent?: number;
  secondaryTarget?: number;
  secondaryLabel?: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";
