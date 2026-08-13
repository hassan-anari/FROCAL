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

export const TYPING_DAILY_LIMIT = 5;
const DAILY_REWARD_XP = 40;
const INITIAL_LIFETIME_XP = 2_356_254;
const INITIAL_LEVEL_XP = 120;
const INITIAL_LEVEL = 1;
const INITIAL_LEVEL_TARGET = 500;
const REFERRAL_REWARD_XP = 140;
const GROUP_REWARD_XP = 200;

const missionTemplate: Record<MissionId, EarnMission> = {
  "visit-dalexio": {
    id: "visit-dalexio",
    title: "Explore Dalexio",
    description: "Open the official website and discover the wider ecosystem.",
    rewardXp: 60,
    status: "available",
    progress: 0,
    target: 1,
    category: "ecosystem",
    action: "external",
    href: "https://dalexio.com/",
  },
  "view-x-update": {
    id: "view-x-update",
    title: "View the latest X update",
    description: "Open the latest community update and return for verification.",
    rewardXp: 70,
    status: "available",
    progress: 0,
    target: 1,
    category: "social",
    action: "external",
    href: "https://x.com/",
  },
  "join-telegram": {
    id: "join-telegram",
    title: "Open the Telegram community",
    description: "Visit the Dalexio community and keep up with new announcements.",
    rewardXp: 90,
    status: "available",
    progress: 0,
    target: 1,
    category: "social",
    action: "external",
    href: "https://t.me/DalexioBot",
  },
  "typing-session": {
    id: "typing-session",
    title: "Complete a Typing Arena run",
    description: "Play one complete round in the permanent Typing Arena.",
    rewardXp: 120,
    status: "available",
    progress: 0,
    target: 1,
    category: "skill",
    action: "typing",
  },
  "complete-profile": {
    id: "complete-profile",
    title: "Review your explorer profile",
    description: "Open your profile and prepare your public Dexo identity.",
    rewardXp: 100,
    status: "available",
    progress: 0,
    target: 1,
    category: "profile",
    action: "profile",
  },
  "read-season-brief": {
    id: "read-season-brief",
    title: "Read the Season One brief",
    description: "Review the current season structure and its progression rules.",
    rewardXp: 80,
    status: "available",
    progress: 0,
    target: 1,
    category: "season",
    action: "external",
    href: "https://dalexio.com/",
  },
};

function cloneMissions(): Record<MissionId, EarnMission> {
  return structuredClone(missionTemplate);
}

export function localDateKey(date = new Date()): string {
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
  typingAttemptDate: string | null;
  typingAttempts: TypingResult[];
  referralSent: boolean;
  referralShares: number;
  referralCount: number;
  verifiedReferrals: number;
  referralXpEarned: number;
  connectedGroups: number;
  activeGroups: number;
  groupXpEarned: number;
  history: EarnHistoryEntry[];
  rewardEvent: RewardEvent | null;
  levelUpEvent: LevelUpEvent | null;
  claimDaily: () => void;
  startMission: (id: MissionId) => void;
  completeMission: (id: MissionId) => void;
  recordTypingResult: (result: TypingResult) => boolean;
  markReferralSent: () => void;
  verifyReferral: () => void;
  verifyGroup: () => void;
  claimMission: (id: MissionId) => void;
  dismissReward: () => void;
  dismissLevelUp: () => void;
  resetEarnProgress: () => void;
  setNearEvolutionForDiagnostics: () => void;
  setLevelForDiagnostics: (level: number) => void;
  completeStarterPathForDiagnostics: () => void;
}

const initialHistory: EarnHistoryEntry[] = [
  {
    id: "journey-ready",
    type: "system",
    title: "Earn Center is online",
    description: "Daily rewards, missions, network growth and the Typing Arena are ready.",
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

function currentTypingAttempts(state: Pick<EarnState, "typingAttemptDate" | "typingAttempts">): TypingResult[] {
  return state.typingAttemptDate === localDateKey() ? state.typingAttempts : [];
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
      typingAttemptDate: null,
      typingAttempts: [],
      referralSent: false,
      referralShares: 0,
      referralCount: 3,
      verifiedReferrals: 2,
      referralXpEarned: 280,
      connectedGroups: 1,
      activeGroups: 1,
      groupXpEarned: 200,
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
              title: `Daily Core · Day ${nextStreak}`,
              description: "Today’s reward was added to your progression.",
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

      startMission: (id) => {
        const state = get();
        const mission = state.missions[id];
        if (!mission || mission.status !== "available") return;
        set({
          missions: {
            ...state.missions,
            [id]: { ...mission, status: "in-progress" },
          },
        });
      },

      completeMission: (id) => {
        const state = get();
        const mission = state.missions[id];
        if (!mission || mission.status === "claimed" || mission.status === "completed") return;
        set({
          missions: {
            ...state.missions,
            [id]: { ...mission, status: "completed", progress: mission.target },
          },
          history: [
            {
              id: createId("history"),
              type: "mission",
              title: `${mission.title} verified`,
              description: "The mission reward is ready to claim.",
              createdAt: new Date().toISOString(),
            },
            ...state.history,
          ],
        });
      },

      recordTypingResult: (result) => {
        const state = get();
        const today = localDateKey();
        const attempts = currentTypingAttempts(state);
        if (attempts.length >= TYPING_DAILY_LIMIT) return false;

        const passed = result.accuracy >= 85 && result.wpm >= 10;
        const typingBest = !state.typingBest || result.score > state.typingBest.score ? result : state.typingBest;
        const mission = state.missions["typing-session"];
        const shouldCompleteMission = mission.status !== "claimed" && mission.status !== "completed";

        set({
          typingBest,
          typingAttemptDate: today,
          typingAttempts: [result, ...attempts],
          missions: shouldCompleteMission
            ? {
                ...state.missions,
                "typing-session": { ...mission, status: "completed", progress: 1 },
              }
            : state.missions,
          history: [
            {
              id: createId("history"),
              type: "typing",
              title: passed ? "Typing Arena run cleared" : "Typing Arena run completed",
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
        set({
          referralSent: true,
          referralShares: state.referralShares + 1,
          history: [
            {
              id: createId("history"),
              type: "referral",
              title: "Referral link shared",
              description: "Verification begins when a new explorer joins through your link.",
              createdAt: new Date().toISOString(),
            },
            ...state.history,
          ],
        });
      },

      verifyReferral: () => {
        const state = get();
        const now = new Date().toISOString();
        set({
          referralSent: true,
          referralCount: state.referralCount + 1,
          verifiedReferrals: state.verifiedReferrals + 1,
          referralXpEarned: state.referralXpEarned + REFERRAL_REWARD_XP,
          history: [
            {
              id: createId("history"),
              type: "referral",
              title: "Explorer referral verified",
              description: "A new verified explorer joined your network.",
              createdAt: now,
              xp: REFERRAL_REWARD_XP,
            },
            ...state.history,
          ],
        });
      },

      verifyGroup: () => {
        const state = get();
        const now = new Date().toISOString();
        set({
          connectedGroups: state.connectedGroups + 1,
          activeGroups: state.activeGroups + 1,
          groupXpEarned: state.groupXpEarned + GROUP_REWARD_XP,
          history: [
            {
              id: createId("history"),
              type: "group",
              title: "Active group verified",
              description: "A Telegram group was connected to the Dalexio network.",
              createdAt: now,
              xp: GROUP_REWARD_XP,
            },
            ...state.history,
          ],
        });
      },

      claimMission: (id) => {
        const state = get();
        const mission = state.missions[id];
        if (!mission || mission.status !== "completed") return;
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
        typingAttemptDate: null,
        typingAttempts: [],
        referralSent: false,
        referralShares: 0,
        referralCount: 3,
        verifiedReferrals: 2,
        referralXpEarned: 280,
        connectedGroups: 1,
        activeGroups: 1,
        groupXpEarned: 200,
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

      setLevelForDiagnostics: (level) => {
        const normalized = Math.max(1, Math.floor(level));
        set({
          level: normalized,
          levelXp: normalized === 1 ? 120 : 90,
          xpToNextLevel: levelTarget(normalized),
          levelUpEvent: null,
          rewardEvent: null,
        });
      },

      completeStarterPathForDiagnostics: () => {
        const state = get();
        const completed = { ...state.missions };
        (Object.keys(completed) as MissionId[]).forEach((id) => {
          const mission = completed[id];
          completed[id] = { ...mission, status: "completed", progress: mission.target };
        });
        set({ missions: completed });
      },
    }),
    {
      name: "dalexio-earn-state-v2",
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
        typingAttemptDate: state.typingAttemptDate,
        typingAttempts: state.typingAttempts,
        referralSent: state.referralSent,
        referralShares: state.referralShares,
        referralCount: state.referralCount,
        verifiedReferrals: state.verifiedReferrals,
        referralXpEarned: state.referralXpEarned,
        connectedGroups: state.connectedGroups,
        activeGroups: state.activeGroups,
        groupXpEarned: state.groupXpEarned,
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

export function getTypingAttemptsToday(
  typingAttemptDate: string | null,
  attempts: TypingResult[],
): TypingResult[] {
  return typingAttemptDate === localDateKey() ? attempts : [];
}

export function getTypingAttemptsRemaining(
  typingAttemptDate: string | null,
  attempts: TypingResult[],
): number {
  return Math.max(0, TYPING_DAILY_LIMIT - getTypingAttemptsToday(typingAttemptDate, attempts).length);
}
