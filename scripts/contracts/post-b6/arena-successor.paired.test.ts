/** Actual successor projection acceptance; enabled after the formal 7c09f8f7 handoff. */
import { beforeAll, expect, it, vi } from "vitest";
import { clanApi } from "../../../src/integrations/api/b5";
import { clanRankPageSchema } from "../../../src/integrations/api/arena";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = "http://127.0.0.1:8792", nativeFetch = globalThis.fetch;
beforeAll(() => { vi.stubGlobal("window", { setTimeout, clearTimeout }); vi.stubGlobal("fetch", (url: string | URL | Request, options: RequestInit) => nativeFetch(typeof url === "string" && url.startsWith("/") ? origin + url : url, options)); });
async function control(body: object): Promise<any> { const r = await nativeFetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) }); expect(r.status).toBe(200); return r.json(); }
async function world(score: number) {
  const owner: { player: string; initData: string } = await control({ action: "player", points: 2500 }); const api = clanApi(owner.initData); await api.role({ role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: owner.player }); await api.verifyGroup(group.id); const clan = await api.create({ telegram_group_id: group.id, name: "Successor live ranking", tag: crypto.randomUUID().slice(0, 8) });
  await control({ action: "b6-settle", player: owner.player, gross: score, key: crypto.randomUUID() }); return { ...owner, api, clan, group, rankId: (await api.membership())!.clan_season_id };
}
async function page(owner: { initData: string }, offset = 0, limit = 30, season?: string) {
  const r = await nativeFetch(`${origin}/api/v1/arena/rankings/clans?offset=${offset}&limit=${limit}${season ? `&season=${encodeURIComponent(season)}` : ""}`, { headers: { Authorization: `tma ${owner.initData}` } }); expect(r.status).toBe(200); return clanRankPageSchema.parse(await r.json());
}
it("removes a dissolved #1 through projection consumption and preserves ranks/counts/pagination/own standing through cold rebuild", async () => {
  const leader = await world(10_000_000), second = await world(9_000_000), third = await world(8_000_000);
  await control({ action: "b6-rankings", player: leader.player });
  const before = await page(leader, 0, 1); expect(before.items[0]).toMatchObject({ clan_id: String(leader.rankId), rank: 1 }); expect(before.own_standing?.rank).toBe(1);
  await leader.api.dissolve(); await control({ action: "post-b6-ranking-projections" }); // No rebuilding or client filtering to hide a missing REMOVE event.
  const first = await page(leader, 0, 1), next = await page(leader, 1, 1);
  expect(first.items[0]).toMatchObject({ clan_id: String(second.rankId), rank: 1 }); expect(next.items[0]).toMatchObject({ clan_id: String(third.rankId), rank: 2 });
  expect(first.total_count).toBe(before.total_count! - 1); expect(first.own_standing).toBeNull(); expect(first.next_offset).toBe(1);
  const all = await page(leader); expect(all.items.some(row => row.clan_id === String(leader.rankId))).toBe(false);
  await control({ action: "post-b6-ranking-projections", cold: true });
  const rebuilt = await page(leader, 0, 1); expect(rebuilt.items).toEqual(first.items); expect(rebuilt.total_count).toBe(first.total_count); expect(rebuilt.own_standing).toBeNull();
  const archive = await control({ action: "post-b6-archive", player: leader.player });
  const historical = await page(leader, 0, 30, archive.season);
  expect(historical).toMatchObject({ archived: true, total_count: 1 });
  expect(historical.items[0]).toMatchObject({ clan_id: archive.clan_id, rank: 1, competitive_score: 123 });
  mkdirSync("work/post-b6-paired", { recursive: true });
  writeFileSync("work/post-b6-paired/successor-rankings-http.json", JSON.stringify({ before, first, next, rebuilt, historical }, null, 2));
}, 120_000);
it("consumes an isolated owner-authorized permit once through ordinary creation, preserving default restrictions and group binding", async () => {
  const owner = await world(50); expect((await owner.api.state()).qa_recreation_authorization_available).toBe(false);
  await owner.api.dissolve();
  const next = await control({ action: "b5-group", player: owner.player }); await owner.api.verifyGroup(next.id);
  const input = { telegram_group_id: next.id, name: "One permitted recreation", tag: crypto.randomUUID().slice(0, 8) };
  await expect(owner.api.create(input)).rejects.toMatchObject({ code: "CLAN_RECREATION_BLOCKED" });
  await control({ action: "post-b6-qa-grant", player: owner.player });
  expect((await owner.api.state()).qa_recreation_authorization_available).toBe(true);
  expect((await owner.api.eligibleGroups()).some(row => row.id === owner.group.id)).toBe(false);
  await expect(owner.api.create({ ...input, telegram_group_id: owner.group.id })).rejects.toMatchObject({ status: 403 });
  expect((await owner.api.state()).qa_recreation_authorization_available).toBe(true);
  const stranger = await control({ action: "player", points: 2500 });
  expect((await clanApi(stranger.initData).state()).qa_recreation_authorization_available).toBe(false);
  const created = await owner.api.create(input); expect(created.id).not.toBe(owner.clan.id);
  expect((await owner.api.create(input)).id).toBe(created.id);
  expect((await owner.api.state()).qa_recreation_authorization_available).toBe(false);
  expect((await owner.api.recovery()).governance?.dissolution.outcome).toBe("IMMEDIATE");
  await owner.api.dissolve(); await control({ action: "post-b6-qa-grant", player: owner.player }); // Replay never replenishes.
  expect((await owner.api.state()).qa_recreation_authorization_available).toBe(false);
  const third = await control({ action: "b5-group", player: owner.player }); await owner.api.verifyGroup(third.id);
  await expect(owner.api.create({ ...input, telegram_group_id: third.id, tag: crypto.randomUUID().slice(0, 8) })).rejects.toMatchObject({ code: "CLAN_RECREATION_BLOCKED" });
}, 120_000);
