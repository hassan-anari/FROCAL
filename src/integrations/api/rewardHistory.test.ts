import { expect, it, vi } from "vitest";
import { formatXp, historyRows, loadRewardHistory, networkRewardHistory, rewardHistorySchema, rewardHistoryView } from "./rewardHistory";
vi.mock("./client", async original => ({ ...(await original<typeof import("./client")>()), apiRequest: vi.fn() }));
import { apiRequest } from "./client";
const item = { id: 41, source_type: "MISSION", context: "PLAYER", player_amount: 71, occurred_at: "2026-10-16T10:10:00Z" };
it("includes only canonical creator and Speaker settlements while preserving general history", () => {
  const items = ["DAILY", "MISSION", "TYPING", "CLAN_ACTIVITY", "CLAN_MISSION", "REFERRAL", "CREATOR", "NETWORK_SPEAKER", "NETWORK_SPEAKER_FAKE"].map((source_type, id) => ({ ...item, id: id + 1, source_type }));
  expect(networkRewardHistory(items).map(row => row.source_type)).toEqual(["CREATOR", "NETWORK_SPEAKER"]);
  expect(historyRows([{ items, next_cursor: null }])).toEqual(items);
});
it("reads the existing endpoint with authenticated cursor pagination and abort propagation", async () => {
  vi.mocked(apiRequest).mockResolvedValue(new Response(JSON.stringify({ items: [item], next_cursor: 41 })));
  const controller = new AbortController();
  expect(await loadRewardHistory("synthetic-launch", 60, controller.signal)).toEqual({ items: [item], next_cursor: 41 });
  expect(apiRequest).toHaveBeenCalledWith("/rewards/history?limit=20&cursor=60", { initData: "synthetic-launch", signal: controller.signal, cache: "no-store" });
});
it("maps exact source/context/signed player amounts without invented mission details", () => {
  expect(rewardHistoryView(item)).toMatchObject({ id: "41", title: "MISSION", description: "PLAYER", xp: 71, createdAt: item.occurred_at });
  expect(rewardHistoryView({ ...item, source_type: "NEW_BACKEND_SOURCE", context: "NEW_CONTEXT", player_amount: -4 })).toMatchObject({ title: "NEW BACKEND SOURCE", description: "NEW CONTEXT", xp: -4 });
  expect([formatXp(0), formatXp(-4), formatXp(71)]).toEqual(["0 XP", "-4 XP", "+71 XP"]);
});
it("preserves server order and removes overlap by ledger identity only", () => {
  expect(historyRows([{ items: [item], next_cursor: 41 }, { items: [item, { ...item, id: 40 }], next_cursor: null }]).map(row => row.id)).toEqual([41, 40]);
});
it.each([{ ...item, player_amount: "71" }, { ...item, occurred_at: "invalid" }, { ...item, id: Number.MAX_SAFE_INTEGER + 1 }])("rejects malformed ledger evidence", row => {
  expect(rewardHistorySchema.safeParse({ items: [row], next_cursor: null }).success).toBe(false);
});
