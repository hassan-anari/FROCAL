export type MissionId =
  | "visit-dalexio"
  | "view-x-update"
  | "join-telegram"
  | "typing-session"
  | "complete-profile"
  | "read-season-brief";

export type MissionStatus = "available" | "in-progress" | "completed" | "claimed";
export type MissionCategory = "ecosystem" | "social" | "skill" | "profile" | "season";
export type MissionAction = "external" | "typing" | "profile";

export interface EarnMission {
  id: MissionId;
  title: string;
  description: string;
  rewardXp: number;
  status: MissionStatus;
  progress: number;
  target: number;
  category: MissionCategory;
  action: MissionAction;
  href?: string;
}

export interface TypingResult {
  accuracy: number;
  wpm: number;
  score: number;
  completedAt: string;
}

export interface EarnHistoryEntry {
  id: string;
  type: "daily" | "mission" | "typing" | "referral" | "group" | "level" | "system";
  title: string;
  description: string;
  createdAt: string;
  xp?: number;
}

export interface RewardEvent {
  id: string;
  source: "daily" | MissionId;
  title: string;
  xp: number;
  createdAt: string;
}

export interface LevelUpEvent {
  id: string;
  previousLevel: number;
  newLevel: number;
  evolution: boolean;
  evolutionTitle: string | null;
  createdAt: string;
}
