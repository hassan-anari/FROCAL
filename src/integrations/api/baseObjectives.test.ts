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
    { ...mission, key: "blocked", available: false, state: "REWARD_READY" as const },
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
it("shows fewer than three when fewer valid missions exist, without inventing progress", () => {
  expect(baseObjectives(undefined)).toEqual([]);
  expect(baseObjectives([{ ...mission, state: "IN_PROGRESS", title: "Server title" }])).toHaveLength(1);
  expect(missionStateLabel("IN_PROGRESS")).toBe("In progress");
});
