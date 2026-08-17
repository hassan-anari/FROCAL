import type { AssetKey } from "@/assets/registry";

export type ArenaRankingMode = "players" | "clans";
export type ArenaHubSection = "overview" | "war" | "history" | "rankings";

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

export type ArenaWarScenario =
  | "idle"
  | "targeting"
  | "preview"
  | "preparation"
  | "attacking"
  | "defending"
  | "result"
  | "status";

export type ArenaWarDirection = "attack" | "defence";

export interface ArenaWarTask {
  id: string;
  title: string;
  description: string;
  scope: "clan" | "personal";
  current: number;
  target: number;
  unit: string;
  warPoints: number;
  completed?: boolean;
}

export interface ArenaWarHistoryEntry {
  id: string;
  opponentId: string;
  direction: ArenaWarDirection;
  result: "victory" | "defeat" | "draw";
  ourProgress: number;
  enemyProgress: number;
  durationLabel: string;
  happenedLabel: string;
  operationsCompleted: number;
  operationsTotal: number;
  mvp: string;
  reward: number;
}

export interface ArenaSeasonSummary {
  number: number;
  name: string;
  daysLeft: number;
  progress: number;
  playerScore: number;
  playerRank: number;
}

/* Compatibility types retained for the previous internal War lab files. */
export type ArenaWarStage =
  | "matchmaking"
  | "opponent"
  | "preview"
  | "confirm"
  | "prepare"
  | "items"
  | "countdown"
  | "battle"
  | "final"
  | "result"
  | "defence"
  | "status";

export type ArenaWarResult = "victory" | "defeat" | "draw" | "successfulAttack" | "successfulDefence";
export type ArenaWarStatus = "protection" | "recovery" | "reward" | "debuff";

export interface ArenaWarStep {
  id: Exclude<ArenaWarStage, "result" | "status">;
  title: string;
  description: string;
  asset: AssetKey;
}

export interface ArenaWarResultMeta {
  id: ArenaWarResult;
  title: string;
  subtitle: string;
  asset: AssetKey;
  scoreDelta: number;
  reward: number;
}

export interface ArenaWarStatusMeta {
  id: ArenaWarStatus;
  title: string;
  subtitle: string;
  asset: AssetKey;
  durationLabel: string;
}
