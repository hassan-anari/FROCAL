import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  EarnHistoryEntry,
  EarnMission,
  LevelUpEvent,
  MissionId,
  RewardEvent,
  TypingResult,
} from "./types";

const DAILY_REWARD_XP = 40;
const INITIAL_LIFETIME_XP = 2_356_254;
const INITIAL_LEVEL_XP = 120;
const INITIAL_LEVEL = 1;
const INITIAL_LEVEL_TARGET = 500;

const missionTemplate: Record<MissionId, EarnMission> = {
  "daily-signal": {
    id: "daily-signal",
    title: "Daily Signal",
    description: "Stabilize your core and complete today’s signal check.",
    rewardXp: 80,
    status: "available",
    progress: 0,
    target: 1,
    category: "daily",
  },
  "typing-protocol": {
    id: "typing-protocol",
    title: "Typing Protocol",
    description: "Clear the precision challenge with at least 85% accuracy.",
    rewardXp: 160,
    status: "available",
    progress: 0,
    target: 1,
    category: "skill",
  },
  "invite-explorer": {
    id: "invite-explorer",
    title: "Invite an Explorer",
    description: "Bring one verified explorer into Dexo Land.",
    rewardXp: 140,
    status: "available",
    progress: 0,
    target: 1,
    category: "community",
  },
};

function cloneMissions(): Record<MissionId, EarnMission> {
  return structuredClone(missionTemplate);
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousLocalDateKey(date = new Date()): string {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return localDateKey(previous);
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function levelTarget(level: number): number {
  if (level <= 1) return 500;
  return 500 + (level - 1) * 180;
}

function evolutionTitle(level: number): string | null {
  if (level >= 30) return "Legend";
  if (level >= 20) return "Vanguard";
  if (level >= 15) return "Specialist";
  if (level >= 10) return "Connector";
  if (level >= 5) return "Explorer";
  return null;
}

interface EarnState {
  missions: Record<MissionId, EarnMission>;
  lastClaimDate: string | null;
  streak: number;
  lifetimeXp: number;
  level: number;
  levelXp: number;
  xpToNextLevel: number;
  typingBest: TypingResult | null;
  referralSent: boolean;
  history: EarnHistoryEntry[];
  rewardEvent: RewardEvent | null;
  levelUpEvent: LevelUpEvent | null;
  claimDaily: () => void;
  completeDailySignal: () => void;
  recordTypingResult: (result: TypingResult) => boolean;
  markReferralSent: () => void;
  verifyReferral: () => void;
  claimMission: (id: MissionId) => void;
  dismissReward: () => void;
  dismissLevelUp: () => void;
  resetEarnProgress: () => void;
  setNearEvolutionForDiagnostics: () => void;
  completeStarterPathForDiagnostics: () => void;
}

const initialHistory: EarnHistoryEntry[] = [
  {
    id: "journey-ready",
    type: "system",
    title: "Mission Control is online",
    description: "Your Starter Protocol is ready to begin.",
    createdAt: new Date().toISOString(),
  },
];

function applyXp(
  state: Pick<EarnState, "level" | "levelXp" | "xpToNextLevel" | "lifetimeXp">,
  amount: number,
): {
  level: number;
  levelXp: number;
  xpToNextLevel: number;
  lifetimeXp: number;
  levelUpEvent: LevelUpEvent | null;
} {
  let level = state.level;
  let levelXp = state.levelXp + amount;
  let xpToNextLevel = state.xpToNextLevel;
  const previousLevel = level;

  while (levelXp >= xpToNextLevel) {
    levelXp -= xpToNextLevel;
    level += 1;
    xpToNextLevel = levelTarget(level);
  }

  const didLevelUp = level > previousLevel;
  const title = evolutionTitle(level);
  const previousTitle = evolutionTitle(previousLevel);
  const evolved = didLevelUp && title !== null && title !== previousTitle;

  return {
    level,
    levelXp,
    xpToNextLevel,
    lifetimeXp: state.lifetimeXp + amount,
    levelUpEvent: didLevelUp
      ? {
          id: createId("level"),
          previousLevel,
          newLevel: level,
          evolution: evolved,
          evolutionTitle: evolved ? title : null,
          createdAt: new Date().toISOString(),
        }
      : null,
  };
}

export const useEarnStore = create<EarnState>()(
  persist(
    (set, get) => ({
      missions: cloneMissions(),
      lastClaimDate: null,
      streak: 0,
      lifetimeXp: INITIAL_LIFETIME_XP,
      level: INITIAL_LEVEL,
      levelXp: INITIAL_LEVEL_XP,
      xpToNextLevel: INITIAL_LEVEL_TARGET,
      typingBest: null,
      referralSent: false,
      history: initialHistory,
      rewardEvent: null,
      levelUpEvent: null,

      claimDaily: () => {
        const state = get();
        const today = localDateKey();
        if (state.lastClaimDate === today) return;

        const nextStreak = state.lastClaimDate === previousLocalDateKey() ? state.streak + 1 : 1;
        const progression = applyXp(state, DAILY_REWARD_XP);
        const now = new Date().toISOString();

        set({
          ...progression,
          lastClaimDate: today,
          streak: nextStreak,
          rewardEvent: {
            id: createId("daily"),
            source: "daily",
            title: "Daily Core Claimed",
            xp: DAILY_REWARD_XP,
            createdAt: now,
          },
          history: [
            {
              id: createId("history"),
              type: "daily",
              title: `Daily core · Day ${nextStreak}`,
              description: "Your daily connection was stabilized.",
              createdAt: now,
              xp: DAILY_REWARD_XP,
            },
            ...(progression.levelUpEvent
              ? [{
                  id: createId("history"),
                  type: "level" as const,
                  title: `Dexo reached Level ${progression.levelUpEvent.newLevel}`,
                  description: progression.levelUpEvent.evolution
                    ? `${progression.levelUpEvent.evolutionTitle} evolution unlocked.`
                    : "A new progression level was unlocked.",
                  createdAt: now,
                }]
              : []),
            ...state.history,
          ],
        });
      },

      completeDailySignal: () => {
        const state = get();
        const mission = state.missions["daily-signal"];
        if (mission.status === "claimed" || mission.status === "completed") return;
        set({
          missions: {
            ...state.missions,
            "daily-signal": { ...mission, status: "completed", progress: 1 },
          },
          history: [
            {
              id: createId("history"),
              type: "mission",
              title: "Daily Signal stabilized",
              description: "Reward is ready to claim.",
              createdAt: new Date().toISOString(),
            },
            ...state.history,
          ],
        });
      },

      recordTypingResult: (result) => {
        const state = get();
        const passed = result.accuracy >= 85 && result.wpm >= 10;
        const currentBest = state.typingBest;
        const typingBest = !currentBest || result.score > currentBest.score ? result : currentBest;
        const mission = state.missions["typing-protocol"];

        set({
          typingBest,
          missions: passed && mission.status !== "claimed"
            ? {
                ...state.missions,
                "typing-protocol": { ...mission, status: "completed", progress: 1 },
              }
            : state.missions,
          history: [
            {
              id: createId("history"),
              type: "typing",
              title: passed ? "Typing Protocol cleared" : "Typing Protocol attempted",
              description: `${Math.round(result.accuracy)}% accuracy · ${Math.round(result.wpm)} WPM`,
              createdAt: result.completedAt,
            },
            ...state.history,
          ],
        });

        return passed;
      },

      markReferralSent: () => {
        const state = get();
        const mission = state.missions["invite-explorer"];
        if (mission.status === "claimed" || mission.status === "completed") return;
        set({
          referralSent: true,
          missions: {
            ...state.missions,
            "invite-explorer": { ...mission, status: "in-progress", progress: 0 },
          },
        });
      },

      verifyReferral: () => {
        const state = get();
        const mission = state.missions["invite-explorer"];
        if (mission.status === "claimed") return;
        set({
          referralSent: true,
          missions: {
            ...state.missions,
            "invite-explorer": { ...mission, status: "completed", progress: 1 },
          },
          history: [
            {
              id: createId("history"),
              type: "referral",
              title: "Explorer referral verified",
              description: "A new explorer joined through your invitation.",
              createdAt: new Date().toISOString(),
            },
            ...state.history,
          ],
        });
      },

      claimMission: (id) => {
        const state = get();
        const mission = state.missions[id];
        if (mission.status !== "completed") return;
        const progression = applyXp(state, mission.rewardXp);
        const now = new Date().toISOString();

        set({
          ...progression,
          missions: {
            ...state.missions,
            [id]: { ...mission, status: "claimed" },
          },
          rewardEvent: {
            id: createId("reward"),
            source: id,
            title: mission.title,
            xp: mission.rewardXp,
            createdAt: now,
          },
          history: [
            {
              id: createId("history"),
              type: "mission",
              title: `${mission.title} reward claimed`,
              description: "XP was added to your Dexo progression.",
              createdAt: now,
              xp: mission.rewardXp,
            },
            ...(progression.levelUpEvent
              ? [{
                  id: createId("history"),
                  type: "level" as const,
                  title: `Dexo reached Level ${progression.levelUpEvent.newLevel}`,
                  description: progression.levelUpEvent.evolution
                    ? `${progression.levelUpEvent.evolutionTitle} evolution unlocked.`
                    : "A new progression level was unlocked.",
                  createdAt: now,
                }]
              : []),
            ...state.history,
          ],
        });
      },

      dismissReward: () => set({ rewardEvent: null }),
      dismissLevelUp: () => set({ levelUpEvent: null }),

      resetEarnProgress: () => set({
        missions: cloneMissions(),
        lastClaimDate: null,
        streak: 0,
        lifetimeXp: INITIAL_LIFETIME_XP,
        level: INITIAL_LEVEL,
        levelXp: INITIAL_LEVEL_XP,
        xpToNextLevel: INITIAL_LEVEL_TARGET,
        typingBest: null,
        referralSent: false,
        history: initialHistory,
        rewardEvent: null,
        levelUpEvent: null,
      }),

      setNearEvolutionForDiagnostics: () => set({
        level: 4,
        levelXp: 490,
        xpToNextLevel: 500,
        levelUpEvent: null,
        rewardEvent: null,
      }),

      completeStarterPathForDiagnostics: () => {
        const state = get();
        set({
          referralSent: true,
          missions: {
            "daily-signal": { ...state.missions["daily-signal"], status: "completed", progress: 1 },
            "typing-protocol": { ...state.missions["typing-protocol"], status: "completed", progress: 1 },
            "invite-explorer": { ...state.missions["invite-explorer"], status: "completed", progress: 1 },
          },
        });
      },
    }),
    {
      name: "dalexio-earn-state-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        missions: state.missions,
        lastClaimDate: state.lastClaimDate,
        streak: state.streak,
        lifetimeXp: state.lifetimeXp,
        level: state.level,
        levelXp: state.levelXp,
        xpToNextLevel: state.xpToNextLevel,
        typingBest: state.typingBest,
        referralSent: state.referralSent,
        history: state.history,
      }),
    },
  ),
);

export function isDailyClaimAvailable(lastClaimDate: string | null): boolean {
  return lastClaimDate !== localDateKey();
}

export function getStarterPathProgress(missions: Record<MissionId, EarnMission>): number {
  const claimed = Object.values(missions).filter((mission) => mission.status === "claimed").length;
  return Math.round((claimed / Object.keys(missions).length) * 100);
}
