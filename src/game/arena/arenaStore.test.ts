import { beforeEach, describe, expect, it } from "vitest";
import { useArenaWarStore } from "./arenaStore";

function reset() {
  useArenaWarStore.getState().resetArena();
}

describe("arena war store", () => {
  beforeEach(reset);

  it("keeps Season 1 as the public default and opens Season 2 only explicitly", () => {
    expect(useArenaWarStore.getState().experienceMode).toBe("season1");
    useArenaWarStore.getState().openSeason2Diagnostics();
    expect(useArenaWarStore.getState().experienceMode).toBe("season2");
    useArenaWarStore.getState().openSeason1Public();
    expect(useArenaWarStore.getState().experienceMode).toBe("season1");
  });

  it("opens the captain target browser", () => {
    useArenaWarStore.getState().openTargeting();
    expect(useArenaWarStore.getState().scenario).toBe("targeting");
    expect(useArenaWarStore.getState().hubSection).toBe("war");
  });

  it("moves a selected rival into preview and preparation", () => {
    useArenaWarStore.getState().selectOpponent("ember-grid");
    expect(useArenaWarStore.getState().selectedOpponentId).toBe("ember-grid");
    expect(useArenaWarStore.getState().scenario).toBe("preview");
    useArenaWarStore.getState().beginPreparation();
    expect(useArenaWarStore.getState().scenario).toBe("preparation");
  });

  it("launches a task-based active attack", () => {
    useArenaWarStore.getState().launchAttack();
    expect(useArenaWarStore.getState().scenario).toBe("attacking");
    expect(useArenaWarStore.getState().direction).toBe("attack");
  });

  it("limits the shared loadout to two items", () => {
    useArenaWarStore.getState().toggleItem("one");
    useArenaWarStore.getState().toggleItem("two");
    useArenaWarStore.getState().toggleItem("three");
    expect(useArenaWarStore.getState().selectedItemIds).toEqual(["one", "two"]);
  });

  it("keeps the previous internal lab stage flow compatible", () => {
    useArenaWarStore.getState().nextStage();
    expect(useArenaWarStore.getState().stage).toBe("opponent");
  });
});
