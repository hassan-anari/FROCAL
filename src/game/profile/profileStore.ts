import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  AchievementId,
  AchievementProgress,
  ConnectionStatus,
  FrameId,
  MedalId,
  TitleId,
} from "./types";

const allAchievementIds: AchievementId[] = [
  "first-mission",
  "first-referral",
  "seven-day-streak",
  "thirty-day-streak",
  "first-verified-activity",
  "clan-ready",
  "first-clan",
  "first-contribution",
  "first-war",
  "first-victory",
];

const allMedalIds: MedalId[] = [
  "season-founding",
  "season-participant",
  "season-veteran",
  "season-top-10",
  "season-top-1",
  "season-champion",
  "activity-veteran",
  "clan-loyalty",
  "leadership",
  "mission-master",
];

const allTitleIds: TitleId[] = [
  "explorer",
  "early-pioneer",
  "mission-runner",
  "network-builder",
  "community-voice",
  "season-veteran",
];

const initialProgress: Record<AchievementId, AchievementProgress> = {
  "first-mission": { current: 1, target: 1 },
  "first-referral": { current: 1, target: 1 },
  "seven-day-streak": { current: 6, target: 7 },
  "thirty-day-streak": { current: 6, target: 30 },
  "first-verified-activity": {
    current: 146,
    target: 200,
    secondaryCurrent: 4,
    secondaryTarget: 5,
    secondaryLabel: "Active days",
  },
  "clan-ready": { current: 0, target: 1 },
  "first-clan": { current: 0, target: 1 },
  "first-contribution": { current: 0, target: 1 },
  "first-war": { current: 0, target: 1 },
  "first-victory": { current: 0, target: 1 },
};

const initialUnlockDates: Partial<Record<AchievementId, string>> = {
  "first-mission": "Jul 12, 2026",
  "first-referral": "Jul 18, 2026",
};

interface ProfileState {
  activeFrameId: FrameId;
  activeTitleId: TitleId;
  featuredMedalId: MedalId | null;
  featuredAchievementId: AchievementId | null;
  unlockedFrameIds: FrameId[];
  unlockedTitleIds: TitleId[];
  unlockedMedalIds: MedalId[];
  unlockedAchievementIds: AchievementId[];
  achievementProgress: Record<AchievementId, AchievementProgress>;
  achievementUnlockDates: Partial<Record<AchievementId, string>>;
  walletStatus: ConnectionStatus;
  walletAddress: string | null;
  dalexioStatus: ConnectionStatus;
  dalexioHandle: string | null;
  shareCount: number;
  setActiveFrame: (id: FrameId) => void;
  setActiveTitle: (id: TitleId) => void;
  setFeaturedMedal: (id: MedalId | null) => void;
  setFeaturedAchievement: (id: AchievementId | null) => void;
  applyCustomization: (input: {
    frameId: FrameId;
    titleId: TitleId;
    medalId: MedalId | null;
    achievementId: AchievementId | null;
  }) => void;
  beginWalletConnection: () => void;
  finishWalletConnection: (address: string) => void;
  failWalletConnection: () => void;
  beginDalexioConnection: () => void;
  finishDalexioConnection: (handle: string) => void;
  failDalexioConnection: () => void;
  incrementShareCount: () => void;
  unlockAllProfileItems: () => void;
  unlockCommunityActivity: () => void;
  unlockWarJourney: () => void;
  setChampionProfile: () => void;
  resetProfile: () => void;
}

const initialState = {
  activeFrameId: "standard" as FrameId,
  activeTitleId: "explorer" as TitleId,
  featuredMedalId: "season-founding" as MedalId,
  featuredAchievementId: "first-mission" as AchievementId,
  unlockedFrameIds: ["standard", "premium", "founder"] as FrameId[],
  unlockedTitleIds: ["explorer", "early-pioneer", "mission-runner", "network-builder"] as TitleId[],
  unlockedMedalIds: ["season-founding", "season-participant", "mission-master"] as MedalId[],
  unlockedAchievementIds: ["first-mission", "first-referral"] as AchievementId[],
  achievementProgress: structuredClone(initialProgress),
  achievementUnlockDates: { ...initialUnlockDates },
  walletStatus: "disconnected" as ConnectionStatus,
  walletAddress: null as string | null,
  dalexioStatus: "disconnected" as ConnectionStatus,
  dalexioHandle: null as string | null,
  shareCount: 0,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setActiveFrame: (id) => {
        if (!get().unlockedFrameIds.includes(id)) return;
        set({ activeFrameId: id });
      },
      setActiveTitle: (id) => {
        if (!get().unlockedTitleIds.includes(id)) return;
        set({ activeTitleId: id });
      },
      setFeaturedMedal: (id) => {
        if (id !== null && !get().unlockedMedalIds.includes(id)) return;
        set({ featuredMedalId: id });
      },
      setFeaturedAchievement: (id) => {
        if (id !== null && !get().unlockedAchievementIds.includes(id)) return;
        set({ featuredAchievementId: id });
      },
      applyCustomization: ({ frameId, titleId, medalId, achievementId }) => {
        const state = get();
        if (!state.unlockedFrameIds.includes(frameId)) return;
        if (!state.unlockedTitleIds.includes(titleId)) return;
        if (medalId !== null && !state.unlockedMedalIds.includes(medalId)) return;
        if (achievementId !== null && !state.unlockedAchievementIds.includes(achievementId)) return;
        set({
          activeFrameId: frameId,
          activeTitleId: titleId,
          featuredMedalId: medalId,
          featuredAchievementId: achievementId,
        });
      },
      beginWalletConnection: () => set({ walletStatus: "connecting" }),
      finishWalletConnection: (address) => set({ walletStatus: "connected", walletAddress: address }),
      failWalletConnection: () => set({ walletStatus: "error", walletAddress: null }),
      beginDalexioConnection: () => set({ dalexioStatus: "connecting" }),
      finishDalexioConnection: (handle) => set({ dalexioStatus: "connected", dalexioHandle: handle }),
      failDalexioConnection: () => set({ dalexioStatus: "error", dalexioHandle: null }),
      incrementShareCount: () => set((state) => ({ shareCount: state.shareCount + 1 })),
      unlockAllProfileItems: () => set({
        unlockedFrameIds: ["standard", "premium", "seasonal", "founder", "clan", "captain"],
        unlockedTitleIds: [...allTitleIds],
        unlockedMedalIds: [...allMedalIds],
        unlockedAchievementIds: [...allAchievementIds],
        achievementProgress: Object.fromEntries(
          Object.entries(initialProgress).map(([id, progress]) => [id, {
            ...progress,
            current: progress.target,
            secondaryCurrent: progress.secondaryTarget ?? progress.secondaryCurrent,
          }]),
        ) as Record<AchievementId, AchievementProgress>,
        achievementUnlockDates: Object.fromEntries(allAchievementIds.map((id) => [id, "Jul 27, 2026"])) as Record<AchievementId, string>,
      }),
      unlockCommunityActivity: () => set((state) => ({
        unlockedAchievementIds: state.unlockedAchievementIds.includes("first-verified-activity")
          ? state.unlockedAchievementIds
          : [...state.unlockedAchievementIds, "first-verified-activity"],
        unlockedTitleIds: state.unlockedTitleIds.includes("community-voice")
          ? state.unlockedTitleIds
          : [...state.unlockedTitleIds, "community-voice"],
        achievementProgress: {
          ...state.achievementProgress,
          "first-verified-activity": {
            current: 200,
            target: 200,
            secondaryCurrent: 5,
            secondaryTarget: 5,
            secondaryLabel: "Active days",
          },
        },
        achievementUnlockDates: { ...state.achievementUnlockDates, "first-verified-activity": "Jul 27, 2026" },
      })),
      unlockWarJourney: () => set((state) => {
        const warIds: AchievementId[] = ["clan-ready", "first-clan", "first-contribution", "first-war", "first-victory"];
        return {
          unlockedAchievementIds: Array.from(new Set([...state.unlockedAchievementIds, ...warIds])),
          achievementProgress: {
            ...state.achievementProgress,
            "clan-ready": { current: 1, target: 1 },
            "first-clan": { current: 1, target: 1 },
            "first-contribution": { current: 1, target: 1 },
            "first-war": { current: 1, target: 1 },
            "first-victory": { current: 1, target: 1 },
          },
          achievementUnlockDates: {
            ...state.achievementUnlockDates,
            ...Object.fromEntries(warIds.map((id) => [id, "Jul 27, 2026"])),
          },
        };
      }),
      setChampionProfile: () => set((state) => ({
        activeFrameId: "seasonal",
        activeTitleId: "season-veteran",
        featuredMedalId: "season-champion",
        unlockedFrameIds: Array.from(new Set([...state.unlockedFrameIds, "seasonal"])),
        unlockedTitleIds: Array.from(new Set([...state.unlockedTitleIds, "season-veteran"])),
        unlockedMedalIds: Array.from(new Set([...state.unlockedMedalIds, "season-veteran", "season-top-10", "season-top-1", "season-champion"])),
      })),
      resetProfile: () => set({
        ...initialState,
        achievementProgress: structuredClone(initialProgress),
        achievementUnlockDates: { ...initialUnlockDates },
      }),
    }),
    {
      name: "dalexio-profile-state-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeFrameId: state.activeFrameId,
        activeTitleId: state.activeTitleId,
        featuredMedalId: state.featuredMedalId,
        featuredAchievementId: state.featuredAchievementId,
        unlockedFrameIds: state.unlockedFrameIds,
        unlockedTitleIds: state.unlockedTitleIds,
        unlockedMedalIds: state.unlockedMedalIds,
        unlockedAchievementIds: state.unlockedAchievementIds,
        achievementProgress: state.achievementProgress,
        achievementUnlockDates: state.achievementUnlockDates,
        walletStatus: state.walletStatus,
        walletAddress: state.walletAddress,
        dalexioStatus: state.dalexioStatus,
        dalexioHandle: state.dalexioHandle,
        shareCount: state.shareCount,
      }),
    },
  ),
);
