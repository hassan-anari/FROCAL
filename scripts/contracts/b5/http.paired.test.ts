import { beforeAll, expect, it, vi } from "vitest";
import { clanApi, ClanApiError } from "../../../src/integrations/api/b5";
import { selectClanApplications } from "../../../src/integrations/api/clanApplications";
const origin = "http://127.0.0.1:8792";
const nativeFetch = globalThis.fetch;
beforeAll(() => {
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("fetch", (url: string | URL | Request, options: RequestInit) => nativeFetch(typeof url === "string" && url.startsWith("/") ? origin + url : url, options));
});
async function control(body: object): Promise<any> {
  const response = await nativeFetch(origin + "/__b2_test__", { method: "POST", body: JSON.stringify(body) });
  expect(response.status).toBe(200); return response.json();
}
async function actor(points = 2500) { const identity: { player: string; initData: string } = await control({ action: "player", points }); return { ...identity, api: clanApi(identity.initData) }; }
async function world(soldiers = 1) {
  const captain = await actor(); await captain.api.role({ role: "CAPTAIN" });
  const group = await control({ action: "b5-group", player: captain.player });
  expect((await captain.api.eligibleGroups()).some(row => row.id === group.id)).toBe(true);
  await captain.api.verifyGroup(group.id);
  const clan = await captain.api.create({ telegram_group_id: group.id, name: "HTTP paired Clan", tag: crypto.randomUUID().slice(0, 8), motto: "Actual isolated API" });
  const members = [];
  for (let i = 0; i < soldiers; i++) {
    const soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
    const request = await soldier.api.join(clan.id); await captain.api.decision(request.id, { accept: true });
    await control({ action: "b5-presence", player: soldier.player, group: group.id });
    expect((await soldier.api.membership())?.clan_id).toBe(clan.id); members.push(soldier);
  }
  return { captain, group, clan, members };
}
it("uses actual eligibility, immutable role and fresh Telegram authority; rejects cross-player and raw chat references", async () => {
  const low = await actor(0); expect((await low.api.state()).eligible).toBe(false);
  await expect(low.api.role({ role: "CAPTAIN" })).rejects.toBeInstanceOf(ClanApiError);
  const captain = await actor(); await captain.api.role({ role: "CAPTAIN" });
  await expect(captain.api.role({ role: "SOLDIER" })).rejects.toMatchObject({ status: 409 });
  const group = await control({ action: "b5-group", player: captain.player });
  await control({ action: "b5-authority", player: captain.player, group: group.id, admin: false });
  await expect(captain.api.verifyGroup(group.id)).rejects.toMatchObject({ status: 403 });
  await control({ action: "b5-authority", player: captain.player, group: group.id, admin: true });
  expect((await captain.api.verifyGroup(group.id)).verification_state).toBe("VERIFIED");
  await control({ action: "b5-transport", mode: "unavailable" });
  await expect(captain.api.create({ telegram_group_id: group.id, name: "Blocked home", tag: "BLOK" })).rejects.toMatchObject({ status: 409 });
  await control({ action: "b5-transport", mode: "ok" });
  const outsider = await actor(); await outsider.api.role({ role: "CAPTAIN" });
  await expect(outsider.api.verifyGroup(group.id)).rejects.toBeInstanceOf(ClanApiError);
}, 30_000);
it("refreshes pending/rejected/accepted requests and revokes only the caller's credentials", async () => {
  const { captain, clan } = await world(0);
  const soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  let request = await soldier.api.join(clan.id);
  expect((await soldier.api.ownRequests())[0].state).toBe("PENDING");
  await captain.api.decision(request.id, { accept: false });
  expect((await soldier.api.ownRequests())[0].state).toBe("DECLINED");
  request = await soldier.api.join(clan.id);
  await captain.api.decision(request.id, { accept: true });
  expect((await soldier.api.ownRequests())[0].state).toBe("ACCEPTED");
  expect(await soldier.api.membership()).toBeNull();
  const other = await actor(); await other.api.role({ role: "SOLDIER" });
  expect(await other.api.ownRequests()).toEqual([]);
  await expect(other.api.invite()).rejects.toMatchObject({ status: 404 });
  await expect(other.api.cancelRequest(request.id)).rejects.toMatchObject({ status: 404 });
  await soldier.api.cancelRequest(request.id);
  expect(["CANCELLED", "ACCEPTED"]).toContain((await soldier.api.ownRequests())[0].state);
}, 30_000);
it("pairs Treasury, shop and activation concurrency with frontend DTOs and exact replay identities", async () => {
  const { captain, members: [soldier] } = await world();
  await control({ action: "b5-reward", player: soldier.player });
  const before = await captain.api.home();
  const rule = (await captain.api.equipment()).items.find(row => row.item_id === "rally-beacon")!;
  const key = crypto.randomUUID();
  const purchases = await Promise.all([captain.api.purchase(rule.item_id, key), captain.api.purchase(rule.item_id, key)]);
  expect(purchases[0].id).toBe(purchases[1].id); expect(purchases.some(row => row.replayed)).toBe(true);
  expect((await captain.api.home()).treasury_balance).toBe(before.treasury_balance - rule.price);
  expect((await captain.api.equipment()).items.find(row => row.item_id === rule.item_id)?.quantity).toBe(1);
  const useKey = crypto.randomUUID();
  const uses = await Promise.all([captain.api.activate(rule.item_id, useKey), captain.api.activate(rule.item_id, useKey)]);
  expect(uses[0].id).toBe(uses[1].id);
  const equipment = await captain.api.equipment();
  expect(equipment.items.find(row => row.item_id === rule.item_id)?.quantity).toBe(0);
  expect(equipment.active_effects.some(effect => effect.item_id === rule.item_id && effect.effective)).toBe(true);
  await expect(soldier.api.purchase(rule.item_id, crypto.randomUUID())).rejects.toMatchObject({ status: 403 });
  await expect(captain.api.purchase("not-published", crypto.randomUUID())).rejects.toBeInstanceOf(ClanApiError);
}, 30_000);
it("uses real governance electorate, immutable voting, recovery restrictions, leave cooldown and contribution retention", async () => {
  const { captain, members, group } = await world(3);
  await control({ action: "b5-reward", player: members[0].player });
  const target = await members[0].api.membership();
  const proposal = await captain.api.removalCase({ target_membership_id: target!.membership_id, reason: "COMMUNITY_REASON" });
  expect(proposal.yes_count).toBeNull();
  await expect(members[0].api.vote(proposal.id, { choice: "YES" })).rejects.toMatchObject({ status: 403 });
  await captain.api.vote(proposal.id, { choice: "YES" });
  await expect(captain.api.vote(proposal.id, { choice: "NO" })).rejects.toMatchObject({ status: 409 });
  await control({ action: "b5-bot-admin", player: captain.player, admin: false });
  expect((await captain.api.recovery()).home_integrity_available).toBe(false);
  expect((await captain.api.equipment()).items.every(row => !row.can_purchase && !row.can_activate)).toBe(true);
  await control({ action: "b5-bot-admin", player: captain.player, admin: true });
  expect((await captain.api.recovery()).home_integrity_available).toBe(true);
  const contribution = (await captain.api.home()).total_contribution;
  await members[0].api.leave();
  expect(await members[0].api.membership()).toBeNull();
  expect((await members[0].api.state()).cooldown_until).not.toBeNull();
  expect((await captain.api.home()).total_contribution).toBe(contribution);
  await expect(members[0].api.join((await captain.api.membership())!.clan_id)).rejects.toMatchObject({ status: 409 });
  // Home group ID remains internal and is never used as a Telegram identity assertion.
  expect(group.id).toBeGreaterThan(0);
}, 30_000);
it("keeps independent Captain/bot authority causes until fresh original-Captain verification and denies Soldier verification", async () => {
  const { captain, members: [soldier] } = await world();
  await control({ action: "b5-captain-authority", player: captain.player, admin: false });
  expect((await captain.api.recovery()).reasons).toContain("CAPTAIN_AUTHORITY_LOSS");
  await expect(soldier.api.verifyAuthority()).rejects.toMatchObject({ status: 403 });
  await control({ action: "b5-transport", mode: "unavailable" });
  await expect(captain.api.verifyAuthority()).rejects.toMatchObject({ status: 409 });
  await control({ action: "b5-transport", mode: "ok" });
  expect((await captain.api.recovery()).state).toBe("RECOVERY");
  await control({ action: "b5-bot-admin", player: captain.player, admin: false });
  await control({ action: "b5-captain-authority", player: captain.player, admin: true });
  const partial = await captain.api.verifyAuthority();
  expect(partial.reasons).toContain("BOT_ADMIN_LOSS"); expect(partial.home_integrity_available).toBe(false);
  await control({ action: "b5-bot-admin", player: captain.player, admin: true });
  expect(await captain.api.verifyAuthority()).toMatchObject({ state: "ACTIVE", reasons: [], home_integrity_available: true });
}, 30_000);
it.each([false, true])("a single application (accepted=%s) blocks another Clan without replacing the original", async accepted => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const request = await soldier.api.join(a.clan.id); if (accepted) await a.captain.api.decision(request.id, { accept: true });
  await expect(soldier.api.join(b.clan.id)).rejects.toMatchObject({ status: 409, code: "CLAN_STATE_CONFLICT" });
  expect(selectClanApplications(await soldier.api.ownRequests()).activeRequest).toMatchObject({ id: request.id, clan_id: a.clan.id, state: accepted ? "ACCEPTED" : "PENDING" }); expect(await soldier.api.membership()).toBeNull();
}, 30_000);
it("retains accepted reservations until confirmed revocation, then activates only verified membership", async () => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const request = await soldier.api.join(a.clan.id); await a.captain.api.decision(request.id, { accept: true });
  await control({ action: "b5-request-history", player: soldier.player, clan: b.clan.id, count: 26 });
  const rows = await soldier.api.ownRequests();
  expect(rows.some(row => row.id > request.id && row.state === "CANCELLED")).toBe(true);
  expect(selectClanApplications(rows).activeRequest).toMatchObject({ id: request.id, state: "ACCEPTED", clan_id: a.clan.id });
  expect((await soldier.api.invite()).state).toBe("ACTIVE"); expect(await soldier.api.membership()).toBeNull();
  await control({ action: "b5-transport", mode: "revoke-unavailable" });
  try {
    await soldier.api.cancelRequest(request.id); await control({ action: "b5-revoke-worker", player: soldier.player, request: request.id });
    expect(selectClanApplications(await soldier.api.ownRequests()).activeRequest).toMatchObject({ id: request.id, state: "ACCEPTED", cancellation_pending: true });
    await expect(soldier.api.join(b.clan.id)).rejects.toMatchObject({ status: 409 });
  } finally { await control({ action: "b5-transport", mode: "ok" }); }
  await control({ action: "advance", seconds: 120 });
  expect((await control({ action: "b5-revoke-worker", player: soldier.player, request: request.id })).state).toBe("REVOKED");
  expect(selectClanApplications(await soldier.api.ownRequests()).activeRequest).toBeNull();
  const next = await soldier.api.join(b.clan.id); await b.captain.api.decision(next.id, { accept: true }); expect(await soldier.api.membership()).toBeNull();
  await control({ action: "b5-presence", player: soldier.player, group: b.group.id });
  expect((await soldier.api.membership())?.clan_id).toBe(b.clan.id);
  const activated = selectClanApplications(await soldier.api.ownRequests()); expect(activated.activeRequest).toBeNull(); expect(activated.history.some(row => row.id === next.id && row.state === "ACTIVATED")).toBe(true);
}, 30_000);
it("serializes concurrent applications to different Clans without replacing or cancelling the winner", async () => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const results = await Promise.allSettled([soldier.api.join(a.clan.id), soldier.api.join(b.clan.id)]);
  expect(results.filter(row => row.status === "fulfilled")).toHaveLength(1); expect(results.find(row => row.status === "rejected")).toMatchObject({ reason: { status: 409 } });
  const selection = selectClanApplications(await soldier.api.ownRequests()); expect(selection.ambiguous).toBe(false); expect(selection.activeRequest?.state).toBe("PENDING"); expect(selection.history).toHaveLength(0);
  await soldier.api.cancelRequest(selection.activeRequest!.id); expect(selectClanApplications(await soldier.api.ownRequests()).activeRequest).toBeNull();
  const other = selection.activeRequest!.clan_id === a.clan.id ? b : a; expect((await soldier.api.join(other.clan.id)).state).toBe("PENDING");
}, 30_000);
it("selects an older accepted application rather than newer cancelled and declined database history", async () => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const request = await soldier.api.join(a.clan.id); await a.captain.api.decision(request.id, { accept: true });
  await control({ action: "b5-request-history", player: soldier.player, clan: b.clan.id, state: "CANCELLED" }); await control({ action: "b5-request-history", player: soldier.player, clan: b.clan.id, state: "DECLINED" });
  const rows = await soldier.api.ownRequests(); expect(rows.some(row => row.id > request.id && row.state === "DECLINED")).toBe(true);
  const selection = selectClanApplications(rows); expect(selection.activeRequest).toMatchObject({ id: request.id, clan_id: a.clan.id, state: "ACCEPTED" }); expect(selection.history.map(row => row.state).sort()).toEqual(["CANCELLED", "DECLINED"]);
  expect(selectClanApplications([...rows].sort((left, right) => right.id - left.id)).activeRequest?.id).toBe(request.id);
  expect((await soldier.api.invite()).state).toBe("ACTIVE"); expect(await soldier.api.membership()).toBeNull();
}, 30_000);
it("keeps every active application discoverable beyond the ordinary terminal history limit", async () => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const request = await soldier.api.join(a.clan.id); await a.captain.api.decision(request.id, { accept: true });
  await control({ action: "b5-request-history", player: soldier.player, clan: b.clan.id, count: 26 });
  expect(selectClanApplications(await soldier.api.ownRequests()).activeRequest?.id).toBe(request.id);
}, 30_000);

it.each(["older", "terminal"])("keeps %s operator-required paths blocking until actual authorized proof", async kind => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const legacy = await control({ action: "b5-legacy-path", player: soldier.player, clan: a.clan.id, kind });
  const rows = await soldier.api.ownRequests(); const row = rows.find(row => row.id === legacy.request)!;
  expect(row).toMatchObject({ handling: "OPERATOR_REQUIRED", blocks_new_application: true, credential_unresolved: true, is_current_season: kind !== "older", is_active: kind === "older", season_id: legacy.season_id, clan_season_id: legacy.clan_season_id });
  expect(selectClanApplications(rows)).toMatchObject({ activeRequest: null, operatorRequest: row, blocksNewApplication: true });
  await expect(soldier.api.join(b.clan.id)).rejects.toMatchObject({ status: 409 });
  if (kind === "older") await expect(soldier.api.invite()).rejects.toMatchObject({ status: 409 });
  expect((await control({ action: "b5-resolve-proof", player: soldier.player, request: legacy.request })).state).toBe("REVOKED");
  expect(selectClanApplications(await soldier.api.ownRequests()).blocksNewApplication).toBe(false);
  expect((await soldier.api.join(b.clan.id)).state).toBe("PENDING");
}, 30_000);
it("detects a current active path plus an unresolved terminal credential before selecting any action", async () => {
  const a = await world(0), b = await world(0), soldier = await actor(); await soldier.api.role({ role: "SOLDIER" });
  const active = await soldier.api.join(a.clan.id);
  const legacy = await control({ action: "b5-legacy-path", player: soldier.player, clan: b.clan.id, kind: "terminal" });
  const blocked = selectClanApplications(await soldier.api.ownRequests());
  expect(blocked).toMatchObject({ ambiguous: true, activeRequest: null, blocksNewApplication: true }); expect(blocked.blockingRequests).toHaveLength(2);
  expect(blocked.blockingRequests.filter(row => row.is_active)).toHaveLength(1);
  await expect(soldier.api.join(b.clan.id)).rejects.toMatchObject({ status: 409 });
  await control({ action: "b5-resolve-proof", player: soldier.player, request: legacy.request });
  expect(selectClanApplications(await soldier.api.ownRequests()).activeRequest?.id).toBe(active.id);
  await soldier.api.cancelRequest(active.id);
  expect(selectClanApplications(await soldier.api.ownRequests()).blocksNewApplication).toBe(false);
  expect((await soldier.api.join(b.clan.id)).state).toBe("PENDING");
}, 30_000);
