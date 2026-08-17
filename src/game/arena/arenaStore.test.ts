import { beforeEach, describe, expect, it } from "vitest";
import { useArenaWarStore } from "./arenaStore";

function reset() {
  useArenaWarStore.setState({
    debugUnlocked: false,
    stage: "matchmaking",
    result: "victory",
    status: "protection",
    selectedItemIds: [],
    battleProgress: 68,
    enemyProgress: 57,
  });
}

describe("arena war store", () => {
  beforeEach(reset);

  it("moves through the war flow", () => {
    useArenaWarStore.getState().nextStage();
    expect(useArenaWarStore.getState().stage).toBe("opponent");
  });

  it("limits the shared loadout to two items", () => {
    const state = useArenaWarStore.getState();
    state.toggleItem("one");
    useArenaWarStore.getState().toggleItem("two");
    useArenaWarStore.getState().toggleItem("three");
    expect(useArenaWarStore.getState().selectedItemIds).toEqual(["one", "two"]);
  });

  it("clears attack loadout before defence", () => {
    useArenaWarStore.setState({ stage: "result", selectedItemIds: ["one", "two"] });
    useArenaWarStore.getState().nextStage();
    expect(useArenaWarStore.getState().stage).toBe("defence");
    expect(useArenaWarStore.getState().selectedItemIds).toEqual([]);
  });
});
