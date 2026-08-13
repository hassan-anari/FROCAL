import { beforeEach, describe, expect, it } from "vitest";
import { useClanStore } from "./clanStore";

describe("clan store", () => {
  beforeEach(() => {
    localStorage.clear();
    useClanStore.getState().resetClan();
  });

  it("keeps role choice permanent", () => {
    useClanStore.getState().chooseRole("soldier");
    useClanStore.getState().chooseRole("captain");
    expect(useClanStore.getState().role).toBe("soldier");
  });

  it("allows only one pending join request", () => {
    useClanStore.getState().chooseRole("soldier");
    useClanStore.getState().requestJoin("nova-vanguard");
    useClanStore.getState().requestJoin("aurora-unit");
    expect(useClanStore.getState().joinRequestClanId).toBe("nova-vanguard");
    expect(useClanStore.getState().joinRequestState).toBe("pending");
  });

  it("moves a soldier to headquarters when the request is accepted", () => {
    useClanStore.getState().setSoldierPendingForDiagnostics();
    useClanStore.getState().acceptCurrentJoinForDiagnostics();
    expect(useClanStore.getState().membership).toBe("member");
    expect(useClanStore.getState().activeClanId).toBe("nova-vanguard");
  });

  it("lets captains purchase an available item from treasury", () => {
    useClanStore.getState().setCaptainHeadquartersForDiagnostics();
    const before = useClanStore.getState().treasury;
    expect(useClanStore.getState().purchaseItem("rally-beacon", 2400)).toBe(true);
    expect(useClanStore.getState().treasury).toBe(before - 2400);
    expect(useClanStore.getState().ownedItemIds).toContain("rally-beacon");
  });
});
