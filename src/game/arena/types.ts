import type { AssetKey } from "@/assets/registry";

export type ArenaRankingMode = "players" | "clans";

export interface ArenaPlayerRank {
  id: string;
  name: string;
  handle: string;
  level: number;
  score: number;
  rank: number;
  clan: string | null;
  initials: string;
  accentHue: number;
}

export interface ArenaWarStep {
  id:
    | "matchmaking"
    | "opponent"
    | "preview"
    | "confirm"
    | "prepare"
    | "items"
    | "countdown"
    | "battle"
    | "final"
    | "defence";
  title: string;
  description: string;
  asset: AssetKey;
}

export interface ArenaSeasonSummary {
  number: number;
  name: string;
  daysLeft: number;
  progress: number;
  playerScore: number;
  playerRank: number;
}
