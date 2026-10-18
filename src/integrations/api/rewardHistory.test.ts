import { expect, it, vi } from "vitest";
import { formatXp, historyRows, loadRewardHistory, rewardHistorySchema, rewardHistoryView } from "./rewardHistory";
vi.mock("./client", async original => ({ ...(await original<typeof import("./client")>()), apiRequest: vi.fn() }));
import { apiRequest } from "./client";
const item = { id: 41, source_type: "MISSION", context: "PLAYER", player_amount: 71, occurred_at: "2026-10-16T10:10:00Z" };
it("requests server filtering on every Network page and retains the supplied cursor", async () => {
  vi.mocked(apiRequest).mockResolvedValue(new Response(JSON.stringify({ items: [{ ...item, source_type: "CREATOR" }], next_cursor: 41 })));
  await loadRewardHistory("synthetic-launch", 60, undefined, "network");
  expect(apiRequest).toHaveBeenCalledWith("/rewards/history?limit=20&category=network&cursor=60", expect.objectContaining({ initData: "synthetic-launch", cache: "no-store" }));
});
it("reads the existing endpoint with authenticated cursor pagination and abort propagation", async () => {
  vi.mocked(apiRequest).mockResolvedValue(new Response(JSON.stringify({ items: [item], next_cursor: 41 })));
  const controller = new AbortController();
  expect(await loadRewardHistory("synthetic-launch", 60, controller.signal)).toEqual({ items: [item], next_cursor: 41 });
  expect(apiRequest).toHaveBeenCalledWith("/rewards/history?limit=20&cursor=60", { initData: "synthetic-launch", signal: controller.signal, cache: "no-store" });
});
it("keeps every backend source in global History and omits category on the first and subsequent pages", async () => {
  const sources = ["DAILY", "MISSION", "TYPING", "REFERRAL", "CREATOR", "NETWORK_SPEAKER", "CLAN_ACTIVITY", "OTHER_CONFIRMED"];
  const items = sources.map((source_type, i) => ({ ...item, id: 60 - i, source_type, player_amount: i % 2 ? -4 : 7 }));
  vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify({ items, next_cursor: 53 })));
  expect((await loadRewardHistory("synthetic-launch", null)).items).toEqual(items);
  expect(apiRequest).toHaveBeenLastCalledWith("/rewards/history?limit=20", expect.objectContaining({ initData: "synthetic-launch" }));
  vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ ...item, id: 52 }], next_cursor: null })));
  expect((await loadRewardHistory("synthetic-launch", 53)).next_cursor).toBeNull();
  expect(apiRequest).toHaveBeenLastCalledWith("/rewards/history?limit=20&cursor=53", expect.anything());
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
it("rejects an incompatible unfiltered Network response instead of mixing feeds or scanning unrelated pages", async () => {
  vi.mocked(apiRequest).mockResolvedValue(new Response(JSON.stringify({ items: [item], next_cursor: 41 })));
  await expect(loadRewardHistory("synthetic-launch", null, undefined, "network")).rejects.toMatchObject({ code: "RESPONSE_INVALID" });
});
