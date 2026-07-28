import { beforeEach, describe, expect, it } from "vitest";
import { useProfileStore } from "./profileStore";

describe("profile store", () => {
  beforeEach(() => {
    localStorage.clear();
    useProfileStore.getState().resetProfile();
  });

  it("does not equip locked frames", () => {
    useProfileStore.getState().setActiveFrame("seasonal");
    expect(useProfileStore.getState().activeFrameId).toBe("standard");
  });

  it("applies unlocked customization", () => {
    useProfileStore.getState().applyCustomization({
      frameId: "premium",
      titleId: "early-pioneer",
      medalId: "mission-master",
      achievementId: "first-referral",
    });

    expect(useProfileStore.getState().activeFrameId).toBe("premium");
    expect(useProfileStore.getState().activeTitleId).toBe("early-pioneer");
    expect(useProfileStore.getState().featuredMedalId).toBe("mission-master");
  });

  it("unlocks verified activity and its title together", () => {
    useProfileStore.getState().unlockCommunityActivity();
    const state = useProfileStore.getState();
    expect(state.unlockedAchievementIds).toContain("first-verified-activity");
    expect(state.unlockedTitleIds).toContain("community-voice");
    expect(state.achievementProgress["first-verified-activity"].current).toBe(200);
  });
});
