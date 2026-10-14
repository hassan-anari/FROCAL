import { create } from "zustand";
import type {
  ArenaHubSection,
  ArenaWarDirection,
  ArenaWarResult,
  ArenaWarScenario,
  ArenaWarStage,
  ArenaWarStatus,
} from "./types";

const warStageOrder: ArenaWarStage[] = [
  "matchmaking", "opponent", "preview", "confirm", "prepare", "items", "countdown", "battle", "final", "result", "defence", "status",
];

interface ArenaWarState {
  experienceMode: "season1" | "season2";
  hubSection: ArenaHubSection;
  scenario: ArenaWarScenario;
  selectedOpponentId: string;
  direction: ArenaWarDirection;
  selectedItemIds: string[];
  battleProgress: number;
  enemyProgress: number;
  result: ArenaWarResult;
  status: ArenaWarStatus;

  setExperienceMode: (mode: "season1" | "season2") => void;
  openSeason1Public: () => void;
  openSeason2Diagnostics: () => void;
  setHubSection: (section: ArenaHubSection) => void;
  setScenario: (scenario: ArenaWarScenario) => void;
  openTargeting: () => void;
  selectOpponent: (opponentId: string) => void;
  beginPreparation: () => void;
  launchAttack: () => void;
  showAttackForDiagnostics: () => void;
  showDefenceForDiagnostics: () => void;
  showResultForDiagnostics: (result?: ArenaWarResult) => void;
  showStatusForDiagnostics: (status?: ArenaWarStatus) => void;
  toggleItem: (itemId: string) => void;
  setBattleProgress: (value: number) => void;
  setEnemyProgress: (value: number) => void;
  resetArena: () => void;

  /* Compatibility API for previous internal War lab files. */
  debugUnlocked: boolean;
  stage: ArenaWarStage;
  setDebugUnlocked: (value: boolean) => void;
  setStage: (stage: ArenaWarStage) => void;
  nextStage: () => void;
  previousStage: () => void;
  setResult: (result: ArenaWarResult) => void;
  setStatus: (status: ArenaWarStatus) => void;
  resetWar: () => void;
}

const baseState = {
  experienceMode: "season1" as const,
  hubSection: "overview" as ArenaHubSection,
  scenario: "idle" as ArenaWarScenario,
  selectedOpponentId: "void-runners",
  direction: "attack" as ArenaWarDirection,
  selectedItemIds: [] as string[],
  battleProgress: 68,
  enemyProgress: 57,
  result: "victory" as ArenaWarResult,
  status: "protection" as ArenaWarStatus,
  debugUnlocked: false,
  stage: "matchmaking" as ArenaWarStage,
};

export const useArenaWarStore = create<ArenaWarState>((set, get) => ({
  ...baseState,

  setExperienceMode: (experienceMode) => {
    if (experienceMode === "season1" || import.meta.env.DEV) set({ experienceMode });
  },
  openSeason1Public: () => set({ ...baseState, experienceMode: "season1", selectedItemIds: [] }),
  openSeason2Diagnostics: () => import.meta.env.DEV && set({ ...baseState, experienceMode: "season2", selectedItemIds: [] }),
  setHubSection: (hubSection) => set({ hubSection }),
  setScenario: (scenario) => import.meta.env.DEV && set({ scenario, hubSection: scenario === "idle" ? "overview" : "war" }),
  openTargeting: () => set({ scenario: "targeting", hubSection: "war", direction: "attack" }),
  selectOpponent: (selectedOpponentId) => set({ selectedOpponentId, scenario: "preview", hubSection: "war", direction: "attack" }),
  beginPreparation: () => set({ scenario: "preparation", hubSection: "war", direction: "attack" }),
  launchAttack: () => set({ scenario: "attacking", hubSection: "war", direction: "attack", battleProgress: 68, enemyProgress: 57 }),
  showAttackForDiagnostics: () => import.meta.env.DEV && set({ scenario: "attacking", hubSection: "war", direction: "attack", battleProgress: 68, enemyProgress: 57 }),
  showDefenceForDiagnostics: () => import.meta.env.DEV && set({ scenario: "defending", hubSection: "war", direction: "defence", battleProgress: 63, enemyProgress: 71 }),
  showResultForDiagnostics: (result = "victory") => import.meta.env.DEV && set({ scenario: "result", hubSection: "war", result }),
  showStatusForDiagnostics: (status = "protection") => import.meta.env.DEV && set({ scenario: "status", hubSection: "war", status }),
  toggleItem: (itemId) => set((state) => {
    if (state.selectedItemIds.includes(itemId)) return { selectedItemIds: state.selectedItemIds.filter((id) => id !== itemId) };
    if (state.selectedItemIds.length >= 2) return state;
    return { selectedItemIds: [...state.selectedItemIds, itemId] };
  }),
  setBattleProgress: (battleProgress) => set({ battleProgress: Math.max(0, Math.min(100, battleProgress)) }),
  setEnemyProgress: (enemyProgress) => set({ enemyProgress: Math.max(0, Math.min(100, enemyProgress)) }),
  resetArena: () => set({ ...baseState, selectedItemIds: [] }),

  setDebugUnlocked: (debugUnlocked) => import.meta.env.DEV && set({ debugUnlocked }),
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
  resetWar: () => set({ ...baseState, selectedItemIds: [] }),
}));

export { warStageOrder };
