import { beforeEach, expect, it } from "vitest";
import { achievementsSchema, collectionSchema, profileOverviewSchema } from "../../../src/integrations/api/profile";
import { playerRankPageSchema, clanRankPageSchema } from "../../../src/integrations/api/arena";
const api = "http://127.0.0.1:8792";
async function control(body: object) {
  const response = await fetch(`${api}/__b2_test__`, { method: "POST", body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Isolated control failed");
  return response.json();
}
let actor: { player: string; initData: string };
async function call(path: string, method = "GET", body?: object, identity = actor) {
  const response = await fetch(`${api}/api/v1${path}`, { method, headers: { Authorization: `tma ${identity.initData}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
beforeEach(async () => {
  await control({ action: "flags" });
  actor = await control({ action: "player", points: 150 });
});
it("binds real Profile catalog entitlement and confirmed cross-device customization without local XP", async () => {
  const overview = profileOverviewSchema.parse((await call("/profile/overview")).data);
  expect(overview.progression.lifetime_points).toBe(150);
  const achievements = achievementsSchema.parse((await call("/profile/achievements")).data);
  expect(achievements.achievements.length).toBeGreaterThan(0);
  const collection = collectionSchema.parse((await call("/profile/collection")).data);
  expect(collection.frames.find(row => row.key === "standard")?.entitled).toBe(true);
  const input = { active_frame: "standard", active_title: "explorer", featured_medal: null, featured_achievement: null };
  expect((await call("/profile/customization", "PUT", input)).status).toBe(200);
  const secondDevice = await control({ action: "credentials", player: actor.player });
  const updated = await call("/profile/overview", "GET", undefined, { player: actor.player, initData: secondDevice.initData });
  expect(updated.status).toBe(200);
  expect(profileOverviewSchema.parse(updated.data).customization).toEqual(input);
  const denied = await call("/profile/customization", "PUT", { ...input, active_frame: "captain" });
  expect(denied.status).toBe(422);
  expect(profileOverviewSchema.parse((await call("/profile/overview")).data).customization).toEqual(input);
  expect((await control({ action: "inspect", player: actor.player })).lifetime).toBe(150);
});
it("keeps customization isolated between authenticated players and rejects unknown cosmetics", async () => {
  const other = await control({ action: "player", points: 0 });
  const before = profileOverviewSchema.parse((await call("/profile/overview", "GET", undefined, other)).data);
  expect((await call("/profile/customization", "PUT", { active_frame: "not-a-frame", active_title: "explorer" })).status).toBe(422);
  const after = profileOverviewSchema.parse((await call("/profile/overview", "GET", undefined, other)).data);
  expect(after.customization).toEqual(before.customization);
  expect(after.progression.lifetime_points).toBe(0);
});
it("uses actual typed PostgreSQL/Redis ranking pages with server tie ordering and own standing", async () => {
  const equal = await control({ action: "player", points: 150 });
  await control({ action: "b4-rebuild-rankings" });
  for (const [path, schema] of [["players", playerRankPageSchema], ["clans", clanRankPageSchema]] as const) {
    const response = await call(`/arena/rankings/${path}?offset=0&limit=30`);
    expect(response.status).toBe(200);
    const page = schema.parse(response.data);
    expect(page.offset).toBe(0); expect(page.limit).toBe(30);
    expect(page.items.length).toBeLessThanOrEqual(30);
    if (path === "players") {
      const rows = playerRankPageSchema.parse(response.data);
      // Ranking IDs are internal Player PKs, while the harness/auth scope uses
      // Telegram user IDs. Never interpret one identifier as the other.
      const otherRows = playerRankPageSchema.parse((await call("/arena/rankings/players?offset=0&limit=30", "GET", undefined, equal)).data);
      expect(rows.own_standing).not.toBeNull();
      expect(otherRows.own_standing).not.toBeNull();
      expect(rows.own_standing!.player_id).not.toBe(otherRows.own_standing!.player_id);
      expect(rows.own_standing!.rank).toBeLessThan(otherRows.own_standing!.rank);
      const next = playerRankPageSchema.parse((await call("/arena/rankings/players?offset=1&limit=1")).data);
      expect(next.items[0].player_id).toBe(rows.items[1].player_id);
    }
    for (let i = 1; i < page.items.length; i++) expect(page.items[i].rank).toBeGreaterThanOrEqual(page.items[i-1].rank);
  }
});
