import type { Mission } from "./b3Contracts";
const priority: Record<string, number> = { REWARD_READY: 0, IN_PROGRESS: 1, AVAILABLE: 2 };
export function baseObjectives(missions: readonly Mission[] | undefined): Mission[] {
  return (missions ?? []).filter(mission => mission.available && mission.state in priority && mission.title.trim()).sort((a, b) => priority[a.state] - priority[b.state]).slice(0, 3);
}
export function missionStateLabel(state: Mission["state"]): string {
  return ({ REWARD_READY: "Reward ready", IN_PROGRESS: "In progress", AVAILABLE: "Available", CLAIMED: "Completed", UNAVAILABLE: "Unavailable" })[state];
}
