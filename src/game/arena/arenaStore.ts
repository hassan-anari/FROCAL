import { create } from "zustand";
import type { ArenaWarResult, ArenaWarStage, ArenaWarStatus } from "./types";

const warStageOrder: ArenaWarStage[] = [
  "matchmaking",
  "opponent",
  "preview",
  "confirm",
  "prepare",
  "items",
  "countdown",
  "battle",
  "final",
  "result",
  "defence",
  "status",
];

interface ArenaWarState {
  debugUnlocked: boolean;
  stage: ArenaWarStage;
  result: ArenaWarResult;
  status: ArenaWarStatus;
  selectedItemIds: string[];
  battleProgress: number;
  enemyProgress: number;
  setDebugUnlocked: (value: boolean) => void;
  setStage: (stage: ArenaWarStage) => void;
  nextStage: () => void;
  previousStage: () => void;
  setResult: (result: ArenaWarResult) => void;
  setStatus: (status: ArenaWarStatus) => void;
  toggleItem: (itemId: string) => void;
  setBattleProgress: (value: number) => void;
  setEnemyProgress: (value: number) => void;
  resetWar: () => void;
}

export const useArenaWarStore = create<ArenaWarState>((set, get) => ({
  debugUnlocked: false,
  stage: "matchmaking",
  result: "victory",
  status: "protection",
  selectedItemIds: [],
  battleProgress: 68,
  enemyProgress: 57,
  setDebugUnlocked: (debugUnlocked) => set({ debugUnlocked }),
  setStage: (stage) => set((state) => ({ stage, selectedItemIds: stage === "defence" ? [] : state.selectedItemIds })),
  nextStage: () => {
    const index = warStageOrder.indexOf(get().stage);
    const next = warStageOrder[Math.min(warStageOrder.length - 1, index + 1)];
    set((state) => ({ stage: next, selectedItemIds: next === "defence" ? [] : state.selectedItemIds }));
  },
  previousStage: () => {
    const index = warStageOrder.indexOf(get().stage);
    set({ stage: warStageOrder[Math.max(0, index - 1)] });
  },
  setResult: (result) => set({ result }),
  setStatus: (status) => set({ status }),
  toggleItem: (itemId) => set((state) => {
    if (state.selectedItemIds.includes(itemId)) {
      return { selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId) };
    }
    if (state.selectedItemIds.length >= 2) return state;
    return { selectedItemIds: [...state.selectedItemIds, itemId] };
  }),
  setBattleProgress: (battleProgress) => set({ battleProgress: Math.max(0, Math.min(100, battleProgress)) }),
  setEnemyProgress: (enemyProgress) => set({ enemyProgress: Math.max(0, Math.min(100, enemyProgress)) }),
  resetWar: () => set({
    stage: "matchmaking",
    result: "victory",
    status: "protection",
    selectedItemIds: [],
    battleProgress: 68,
    enemyProgress: 57,
  }),
}));

export { warStageOrder };
