/** Activate in the paired config only after the new WEDCAL successor handoff.
 * The 07876b3 baseline intentionally lacks the backend ENDED projection correction.
 */
import { beforeAll, expect, it, vi } from "vitest";
import { clanApi } from "../../../src/integrations/api/b5";
import { clanRankPageSchema } from "../../../src/integrations/api/arena";
const origin = "http://127.0.0.1:8792", nativeFetch = globalThis.fetch;
beforeAll(() => { vi.stubGlobal("window", { setTimeout, clearTimeout }); vi.stubGlobal("fetch", (url: string | URL | Request, options: RequestInit) => nativeFetch(typeof url === "string" && url.startsWith("/") ? origin + url : url, options)); });
async function control(body: object): Promise<any> { const r = await nativeFetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) }); expect(r.status).toBe(200); return r.json(); }
async function world(score: number) {
  const owner: { player: string; initData: string } = await control({ action: "player", points: 2500 }); const api = clanApi(owner.initData); await api.role({ role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: owner.player }); await api.verifyGroup(group.id); const clan = await api.create({ telegram_group_id: group.id, name: "Successor live ranking", tag: crypto.randomUUID().slice(0, 8) });
  await control({ action: "b6-settle", player: owner.player, gross: score, key: crypto.randomUUID() }); return { ...owner, api, clan };
}
async function page(owner: { initData: string }, offset = 0, limit = 30, season?: string) {
  const r = await nativeFetch(`${origin}/api/v1/arena/rankings/clans?offset=${offset}&limit=${limit}${season ? `&season=${encodeURIComponent(season)}` : ""}`, { headers: { Authorization: `tma ${owner.initData}` } }); expect(r.status).toBe(200); return clanRankPageSchema.parse(await r.json());
}
it("removes a dissolved #1 through projection consumption and preserves ranks/counts/pagination/own standing through cold rebuild", async () => {
  const leader = await world(10_000_000), second = await world(9_000_000), third = await world(8_000_000);
  await control({ action: "b6-rankings", player: leader.player });
  const before = await page(leader, 0, 1); expect(before.items[0]).toMatchObject({ clan_id: String(leader.clan.id), rank: 1 }); expect(before.own_standing?.rank).toBe(1);
  await leader.api.dissolve(); await control({ action: "post-b6-ranking-projections" }); // No rebuilding or client filtering to hide a missing REMOVE event.
  const first = await page(leader, 0, 1), next = await page(leader, 1, 1);
  expect(first.items[0]).toMatchObject({ clan_id: String(second.clan.id), rank: 1 }); expect(next.items[0]).toMatchObject({ clan_id: String(third.clan.id), rank: 2 });
  expect(first.total_count).toBe(before.total_count! - 1); expect(first.own_standing).toBeNull(); expect(first.next_offset).toBe(1);
  const all = await page(leader); expect(all.items.some(row => row.clan_id === String(leader.clan.id))).toBe(false);
  await control({ action: "post-b6-ranking-projections", cold: true });
  const rebuilt = await page(leader, 0, 1); expect(rebuilt.items).toEqual(first.items); expect(rebuilt.total_count).toBe(first.total_count); expect(rebuilt.own_standing).toBeNull();
}, 120_000);
