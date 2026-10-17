import { beforeAll, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { clanApi } from "../../../src/integrations/api/b5";
import * as c from "../../../src/integrations/api/b6Schemas";
import { clanApplicant, clanMission } from "../../../src/integrations/api/clanViews";
import { clanActivityRows, clanActivityView } from "../../../src/integrations/api/clanActivity";
const origin = "http://127.0.0.1:8792", nativeFetch = globalThis.fetch;
beforeAll(() => { vi.stubGlobal("window", { setTimeout, clearTimeout }); vi.stubGlobal("fetch", (url: string | URL | Request, options: RequestInit) => nativeFetch(typeof url === "string" && url.startsWith("/") ? origin + url : url, options)); });
async function control(body: object): Promise<any> { const response = await nativeFetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) }); expect(response.status).toBe(200); return response.json(); }
async function actor() { const row: { player: string; initData: string } = await control({ action: "player", points: 2500 }); return { ...row, api: clanApi(row.initData) }; }
async function world() { const captain = await actor(); await captain.api.role({ role: "CAPTAIN" }); const group = await control({ action: "b5-group", player: captain.player }); await captain.api.verifyGroup(group.id); const clan = await captain.api.create({ telegram_group_id: group.id, name: "Final B6 paired Clan", tag: crypto.randomUUID().slice(0, 8) }); return { captain, group, clan }; }
it("validates freshly regenerated B6 rank/streak, standing and feed HTTP responses without changing pinned artifacts", () => {
  const fresh = (name: string) => JSON.parse(readFileSync(`${process.env.B6_FRESH_FIXTURES}/b6/${name}`, "utf8"));
  const applicants = fresh("applicants-http.json");
  for (const rows of Object.values(applicants) as unknown[][]) for (const row of rows) expect(c.ApplicantOut.parse(row)).toEqual(row);
  const standing = fresh("clan-standing-http.json");
  expect(c.ClanHomeOut.parse(standing.home)).toEqual(standing.home); expect(c.ClanOut.parse(standing.detail)).toEqual(standing.detail);
  expect(standing.home).toMatchObject({ rank: 1, rank_status: "RANKED", competitive_score: 3, hq_xp: 0, treasury_balance: 0 });
  for (const row of fresh("activity-http.json")) expect(c.ClanActivityPage.parse(row)).toEqual(row);
});
it("pairs applicant Daily streak/Season rank and invitation privacy through actual authenticated endpoints", async () => {
  const { captain, clan, group } = await world(); const soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  await control({ action: "b6-daily", player: soldier.player }); const request = await soldier.api.join(clan.id);
  await control({ action: "b6-rankings", player: captain.player });
  const row = (await captain.api.applicants()).find(row => row.request_id === request.id)!;
  expect(clanApplicant(row)).toMatchObject({ currentStreak: 1, rankStatus: "RANKED" }); expect(row.rank).toBeGreaterThan(0);
  await captain.api.decision(request.id, { accept: true }); expect(await soldier.api.membership()).toBeNull();
  expect(Boolean((await soldier.api.invite()).invite_link?.startsWith("https://t.me/+"))).toBe(true);
  expect(await control({ action: "b6-invite-deliveries", player: soldier.player })).toMatchObject({ private_invites: 0 });
  await expect(captain.api.invite()).rejects.toBeTruthy();
  await control({ action: "b5-presence", player: soldier.player, group: group.id }); expect((await soldier.api.membership())?.clan_id).toBe(clan.id);
  expect((await captain.api.activity()).items.some(row => row.event_type === "MEMBER_JOINED")).toBe(true);
}, 30000);
it("reads fractional carry only from canonical balances/history and safely paginates private source-time activity", async () => {
  const { captain } = await world(); const expectedBalances = [0, 0, 0, 1];
  for (const [i, gross] of [2, 1, 4, 3].entries()) {
    const key = crypto.randomUUID(); const result = await control({ action: "b6-settle", player: captain.player, gross, key });
    expect((await captain.api.home()).treasury_balance).toBe(expectedBalances[i]);
    expect(await control({ action: "b6-settle", player: captain.player, gross, key })).toMatchObject({ id: result.id, created: false });
    expect((await captain.api.treasury()).balance).toBe(expectedBalances[i]);
  }
  await control({ action: "b6-rankings", player: captain.player });
  const home = await captain.api.home(), detail = await captain.api.preview(home.clan_id);
  expect(home.rank).toBe(detail.rank); expect(home.rank_status).toBe("RANKED"); expect(home.competitive_score).toBe(10);
  const arenaResponse = await nativeFetch(origin + "/api/v1/arena/rankings/clans?limit=30", { headers: { Authorization: `tma ${captain.initData}` } });
  expect(arenaResponse.status).toBe(200); expect((await arenaResponse.json()).own_standing.rank).toBe(home.rank);
  for (let i = 0; i < 22; i++) await control({ action: "b6-settle", player: captain.player, gross: 1 });
  const pages = [await captain.api.activity()];
  while (pages.at(-1)!.next_cursor) pages.push(await captain.api.activity(pages.at(-1)!.next_cursor));
  const rows = clanActivityRows([...pages, pages[0]]); expect(rows.filter(row => row.event_type === "CLAN_REWARD_SETTLED")).toHaveLength(26);
  expect(pages.length).toBeGreaterThan(1);
  const another = await world(); await expect(another.captain.api.activity(pages[0].next_cursor)).rejects.toMatchObject({ status: 422 });
  const outsider = await actor(); await expect(outsider.api.activity()).rejects.toBeTruthy(); await expect(captain.api.activity("invalid-cursor")).rejects.toMatchObject({ status: 422 });
}, 60000);
it("consumes real Admin Group/Individual text and server-automatic progress/settlement without claim", async () => {
  const { captain } = await world(); const created = await control({ action: "b6-missions", player: captain.player });
  let missions = (await captain.api.missions()).filter(row => created.missions.some((m: any) => m.key === row.key));
  expect(missions).toHaveLength(2); for (const row of missions) { expect(clanMission(row).title).toBe(created.missions.find((m: any) => m.key === row.key).title); expect(row.progress_units).toBe(0); expect(row.participant_gross_points).toBeGreaterThan(0); }
  await control({ action: "b6-signal", player: captain.player });
  missions = await captain.api.missions(); expect(missions.some(row => row.kind === "INDIVIDUAL" && row.completed && row.reward_state === "SETTLED")).toBe(true); expect(missions.find(row => row.kind === "GROUP")?.progress_units).toBe(1);
  await control({ action: "b6-signal", player: captain.player }); missions = await captain.api.missions(); expect(missions.filter(row => created.missions.some((m: any) => m.key === row.key)).every(row => row.completed && row.reward_state === "SETTLED")).toBe(true);
  expect((await captain.api.activity()).items.filter(row => row.event_type === "MISSION_COMPLETED")).toHaveLength(2);
}, 30000);
it("presents a real B6 zero-net rollover as a Treasury contribution, preserving canonical history and replay", async () => {
  const { captain } = await world();
  await control({ action: "b6-settle", player: captain.player, gross: 9 });
  const key = crypto.randomUUID();
  const settled = await control({ action: "b6-settle", player: captain.player, gross: 1, key });
  expect(settled).toMatchObject({ created: true, gross: 1, player_amount: 0, treasury_amount: 1 });
  const page = await captain.api.activity();
  const row = page.items.find(row => row.event_type === "CLAN_REWARD_SETTLED" && row.amount === 0)!;
  expect(row).toMatchObject({ event_type: "CLAN_REWARD_SETTLED", amount: 0, unit: "PLAYER_POINTS", treasury_amount: 1, contribution_amount: 1 });
  expect(clanActivityView(row)).toEqual({ title: `${row.actor_name || "A member"} contributed to the Clan Treasury`, description: "1 Treasury credits · 1 contribution" });
  expect((await captain.api.treasury()).balance).toBe(1);
  expect((await captain.api.home()).treasury_balance).toBe(1);
  expect(await control({ action: "b6-settle", player: captain.player, gross: 1, key })).toMatchObject({ id: settled.id, created: false, player_amount: 0, treasury_amount: 1 });
  expect((await captain.api.activity()).items.filter(item => item.id === row.id)).toHaveLength(1);
  writeFileSync(`${process.env.B6_FRESH_FIXTURES}/zero-net-activity-http.json`, JSON.stringify(page, null, 2) + "\n");
}, 30000);
it("uses secure group-avatar capabilities or existing null fallback without exposing storage or bot secrets", async () => {
  const captain = await actor(); await captain.api.role({ role: "CAPTAIN" }); const group = await control({ action: "b5-group", player: captain.player });
  expect((await captain.api.eligibleGroups()).find(row => row.id === group.id)?.image_url).toBeNull();
  const photo = await control({ action: "b6-avatar", player: captain.player, group: group.id }); const row = (await captain.api.eligibleGroups()).find(row => row.id === group.id)!;
  expect(row.image_url).toBe(photo.url); expect(row.image_url).toMatch(/^https:\/\/cached-avatar.test\/api\/v1\/profile\/group-avatar\/[\da-f-]+$/);
  expect(JSON.stringify(row)).not.toMatch(/synthetic-key|synthetic-secret|object_key|bot_token|file_id/);
  const image = await nativeFetch(origin + new URL(row.image_url!).pathname); expect(image.status).toBe(200); expect(image.headers.get("content-type")).toBe("image/jpeg");
}, 30000);

for (const scenario of ["pre-activation", "inactive gap", "delayed deactivation"] as const) it(`pairs source-time mission eligibility: ${scenario}`, async () => {
  const { captain } = await world();
  const definitions = await control({ action: "b6-missions", player: captain.player, target_units: 1, activate: scenario !== "pre-activation" });
  const toggle = async () => { for (const row of definitions.missions) await control({ action: "b6-mission-toggle", player: captain.player, key: row.key }); };
  if (scenario === "inactive gap") await toggle();
  // Capture an actual queued source at this point in the lifecycle, never move it.
  const source = await control({ action: "b6-capture-signal", player: captain.player });
  await toggle(); // Activate/reactivate, or deactivate before delayed processing.
  await control({ action: "b6-process-signals", player: captain.player });
  const completed = (await captain.api.activity()).items.filter(row => row.event_type === "MISSION_COMPLETED");
  if (scenario === "delayed deactivation") {
    expect(completed).toHaveLength(2);
    for (const row of completed) expect(Date.parse(row.occurred_at)).toBe(Date.parse(source.occurred_at));
    await toggle(); // Existing completed progress is visible again after reactivation.
    const rows = (await captain.api.missions()).filter(row => definitions.missions.some((d: any) => d.key === row.key));
    expect(rows).toHaveLength(2); expect(rows.every(row => row.completed && row.reward_state === "SETTLED" && row.progress_units === 1)).toBe(true);
    const ids = completed.map(row => row.id);
    await control({ action: "b6-process-signals", player: captain.player });
    expect((await captain.api.activity()).items.filter(row => row.event_type === "MISSION_COMPLETED").map(row => row.id)).toEqual(ids);
  } else {
    expect(completed).toHaveLength(0);
    const rows = (await captain.api.missions()).filter(row => definitions.missions.some((d: any) => d.key === row.key));
    expect(rows).toHaveLength(2); expect(rows.every(row => !row.completed && row.progress_units === 0)).toBe(true);
    expect((await captain.api.treasury()).balance).toBe(0);
    // A genuinely later, newly captured active source can complete both missions.
    await control({ action: "b6-signal", player: captain.player });
    expect((await captain.api.activity()).items.filter(row => row.event_type === "MISSION_COMPLETED")).toHaveLength(2);
  }
}, 60000);
