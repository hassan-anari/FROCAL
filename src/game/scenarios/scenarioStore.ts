import { create } from "zustand";

export type ScenarioId =
  | "new-user"
  | "active-player"
  | "level-20"
  | "clan-member"
  | "clan-captain"
  | "battle-ready"
  | "season-champion"
  | "empty-state"
  | "error-state"
  | "maintenance";

interface ScenarioState {
  activeScenario: ScenarioId;
  setScenario: (scenario: ScenarioId) => void;
}

export const scenarioOptions: Array<{ id: ScenarioId; label: string }> = [
  { id: "new-user", label: "New user" },
  { id: "active-player", label: "Active player" },
  { id: "level-20", label: "Level 20" },
  { id: "clan-member", label: "Clan member" },
  { id: "clan-captain", label: "Clan captain" },
  { id: "battle-ready", label: "Battle ready" },
  { id: "season-champion", label: "Season champion" },
  { id: "empty-state", label: "Empty state" },
  { id: "error-state", label: "Error state" },
  { id: "maintenance", label: "Maintenance" },
];

export const useScenarioStore = create<ScenarioState>((set) => ({
  activeScenario: "new-user",
  setScenario: (activeScenario) => { if (import.meta.env.DEV) set({ activeScenario }); },
}));
