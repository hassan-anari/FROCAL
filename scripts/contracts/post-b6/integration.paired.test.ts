import { beforeAll, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { clanApi } from "../../../src/integrations/api/b5";
import { loadRewardHistory } from "../../../src/integrations/api/rewardHistory";
import { loadNotifications, markNotificationRead } from "../../../src/integrations/api/notifications";
import { RecoveryOut } from "../../../src/integrations/api/postB6Schemas";
const origin = "http://127.0.0.1:8792", nativeFetch = globalThis.fetch;
const evidence: Record<string, unknown> = {};
function record(name: string, value: unknown) { evidence[name] = value; mkdirSync("work/post-b6-paired", { recursive: true }); writeFileSync("work/post-b6-paired/http-evidence.json", JSON.stringify(evidence, null, 2)); }
beforeAll(() => { vi.stubGlobal("window", { setTimeout, clearTimeout }); vi.stubGlobal("fetch", (url: string | URL | Request, options: RequestInit) => nativeFetch(typeof url === "string" && url.startsWith("/") ? origin + url : url, options)); });
async function control(body: object): Promise<any> { const r = await nativeFetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) }); expect(r.status).toBe(200); return r.json(); }
async function actor() { const row: { player: string; initData: string } = await control({ action: "player", points: 2500 }); return { ...row, api: clanApi(row.initData) }; }
async function world(count = 0) {
  const captain = await actor(); await captain.api.role({ role: "CAPTAIN" }); const group = await control({ action: "b5-group", player: captain.player }); await captain.api.verifyGroup(group.id);
  const clan = await captain.api.create({ telegram_group_id: group.id, name: "Post B6 paired", tag: crypto.randomUUID().slice(0, 8) }); const soldiers = [];
  for (let i = 0; i < count; i++) { const soldier = await actor(); await soldier.api.role({ role: "SOLDIER" }); const request = await soldier.api.join(clan.id); await captain.api.decision(request.id, { accept: true }); await control({ action: "b5-presence", player: soldier.player, group: group.id }); soldiers.push(soldier); }
  return { captain, group, clan, soldiers };
}
it("filters before pagination past 25 unrelated records, preserves Base ledger, and isolates owners", async () => {
  const owner = await actor(), foreign = await actor();
  for (let i = 0; i < 23; i++) await control({ action: "reward", player: owner.player, source: i % 2 ? "CREATOR" : "NETWORK_SPEAKER", amount: 1 });
  for (let i = 0; i < 25; i++) await control({ action: "reward", player: owner.player, source: "DAILY", amount: 1 });
  await control({ action: "reward", player: foreign.player, source: "CREATOR", amount: 7 });
  const first = await loadRewardHistory(owner.initData, null, undefined, "network");
  expect(first.items).toHaveLength(20); expect(first.items.every(row => ["CREATOR", "NETWORK_SPEAKER"].includes(row.source_type))).toBe(true); expect(first.next_cursor).toBe(first.items.at(-1)!.id);
  const second = await loadRewardHistory(owner.initData, first.next_cursor, undefined, "network"); expect(second.items).toHaveLength(3); expect(second.next_cursor).toBeNull();
  expect(new Set([...first.items, ...second.items].map(row => row.id)).size).toBe(23);
  const base = await loadRewardHistory(owner.initData, null); expect(base.items).toHaveLength(20); expect(base.items.every(row => row.source_type === "DAILY")).toBe(true);
  const empty = await loadRewardHistory(owner.initData, second.items.at(-1)!.id, undefined, "network"); expect(empty).toEqual({ items: [], next_cursor: null });
  const other = await loadRewardHistory(foreign.initData, null, undefined, "network"); expect(other.items).toHaveLength(1); expect(other.items[0].player_amount).toBe(7);
  record("network", { first, second, empty, base });
}, 120_000);
it("pairs immediate singleton dissolution and irreversible same-Season recreation protection", async () => {
  const { captain, group } = await world(); const ready = await captain.api.recovery();
  expect(RecoveryOut.parse(ready)).toEqual(ready); expect(ready.governance!.dissolution).toMatchObject({ outcome: "IMMEDIATE", can_open: true, eligible_count: 1, same_season_recreation_allowed: false });
  expect(await captain.api.governance()).toEqual([]); expect(await captain.api.dissolve()).toBeNull(); expect(await captain.api.membership()).toBeNull();
  await expect(captain.api.create({ telegram_group_id: group.id, name: "Forbidden second", tag: "NOPE" })).rejects.toMatchObject({ code: "CLAN_RECREATION_BLOCKED" });
  record("immediate", ready);
}, 60_000);
it("pairs blocked two-member electorate, target exclusion, valid vote and rejected-409 finality", async () => {
  const small = await world(1); const ready = await small.captain.api.recovery();
  expect(ready.governance!.dissolution).toMatchObject({ outcome: "BLOCKED", eligible_count: 2, blocked_reason: "CLAN_GOVERNANCE_INSUFFICIENT_VOTERS" });
  expect(ready.governance!.removal_targets[0].eligible_count).toBe(1);
  await expect(small.captain.api.dissolve()).rejects.toMatchObject({ status: 409, code: "CLAN_GOVERNANCE_INSUFFICIENT_VOTERS" });
  expect(await small.captain.api.governance()).toEqual([]); expect(await small.soldiers[0].api.membership()).toBeTruthy();
  const large = await world(3); const vote = await large.captain.api.recovery(); expect(vote.governance!.dissolution.outcome).toBe("VOTE_REQUIRED");
  expect(vote.governance!.removal_targets.every(row => row.eligible_count === 3)).toBe(true);
  const opened = await large.captain.api.dissolve(); expect(opened).toMatchObject({ case_type: "CAPTAIN_DISSOLUTION", status: "OPEN" }); expect(await large.captain.api.membership()).toBeTruthy();
  const replay = await large.captain.api.dissolve(); expect(replay?.id).toBe(opened?.id);
  record("blocked", ready); record("vote", { readiness: vote, opened });
}, 60_000);
it("uses meaningful actual Clan notification content without leaking invitation credentials", async () => {
  const { captain, clan } = await world(); const soldier = await actor(); await soldier.api.role({ role: "SOLDIER" }); const request = await soldier.api.join(clan.id); await captain.api.decision(request.id, { accept: true });
  await soldier.api.invite();
  const list = await loadNotifications(soldier.initData); const invite = list.items.find(item => item.type === "CLAN_INVITE_READY")!;
  expect(invite.title).toBe("Clan invitation ready"); expect(invite.body).toContain("Clan Status"); expect(invite.deep_link?.path).toBe("/clan");
  expect(JSON.stringify(list)).not.toContain("https://t.me/+");
  const read = await markNotificationRead(soldier.initData, invite.id); expect(read.body).toBe(invite.body); expect(read.unread).toBe(false);
  record("notifications", { list, read });
}, 60_000);

it("pairs legacy blank list/read fallback without rewriting stored notification content", async () => {
  const owner = await actor(); const saved = await control({ action: "post-b6-legacy-notification", player: owner.player });
  expect(saved).toMatchObject({ stored_title: "", stored_body: " " });
  const list = await loadNotifications(owner.initData); const row = list.items.find(item => item.id === saved.id)!;
  expect(row.title).toBe("Clan invitation ready"); expect(row.body).toContain("Clan Status");
  const read = await markNotificationRead(owner.initData, row.id); expect(read.title).toBe(row.title); expect(read.body).toBe(row.body);
  expect(await control({ action: "post-b6-legacy-notification", player: owner.player, id: row.id })).toMatchObject({ stored_title: "", stored_body: " " });
  record("legacy_notification", { list: row, read });
}, 60_000);
