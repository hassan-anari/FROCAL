import { expect, it } from "vitest";
import { baseObjectives, missionStateLabel } from "./baseObjectives";
import { missionSchema } from "./b3Contracts";
import fixture from "./fixtures/b3/earn-network.json";
const mission = { ...missionSchema.parse(fixture.mission_list[0]), available: true, title: "Server title" };
it("prioritizes real actionable missions stably and excludes unavailable, claimed and untitled rows", () => {
  const candidates = [
    { ...mission, key: "available", state: "AVAILABLE" as const, reward_amount: 73 },
    { ...mission, key: "working", state: "IN_PROGRESS" as const },
    { ...mission, key: "ready", state: "REWARD_READY" as const },
    { ...mission, key: "blocked", available: false, state: "AVAILABLE" as const },
    { ...mission, key: "unavailable", state: "UNAVAILABLE" as const },
    { ...mission, key: "done", state: "CLAIMED" as const },
    { ...mission, key: "untitled", title: " ", state: "AVAILABLE" as const },
  ];
  const result = baseObjectives(candidates);
  expect(result.map(m => m.key)).toEqual(["ready", "working", "available"]);
  expect(result[2].reward_amount).toBe(73);
  expect(result[0].title).toBe(mission.title);
  expect(candidates[0].key).toBe("available");
  expect(missionStateLabel(result[0].state)).toBe("Reward ready");
});
it("preserves a server-confirmed vested obligation even when new starts are unavailable", () => {
  const ready = { ...mission, available: false, state: "REWARD_READY" as const };
  expect(baseObjectives([ready])).toEqual([ready]);
});
it.each([[], [{ ...mission, state: "CLAIMED" as const }], [{ ...mission, state: "UNAVAILABLE" as const }]].map(rows => ({ rows })))("has no objectives for confirmed empty or ineligible results: %j", ({ rows }) => {
  expect(baseObjectives(rows)).toEqual([]);
});
it("keeps priority, stable ordering and a maximum of three without mutating the input", () => {
  const rows = ["AVAILABLE", "IN_PROGRESS", "REWARD_READY", "REWARD_READY", "AVAILABLE"].map((state, i) => ({ ...mission, key: String(i), state: state as typeof mission.state }));
  expect(baseObjectives(rows).map(m => m.key)).toEqual(["2", "3", "1"]);
  expect(rows.map(m => m.key)).toEqual(["0", "1", "2", "3", "4"]);
});
it("shows fewer than three when fewer valid missions exist, without inventing progress", () => {
  expect(baseObjectives(undefined)).toEqual([]);
  expect(baseObjectives([{ ...mission, state: "IN_PROGRESS", title: "Server title" }])).toHaveLength(1);
  expect(missionStateLabel("IN_PROGRESS")).toBe("In progress");
});
