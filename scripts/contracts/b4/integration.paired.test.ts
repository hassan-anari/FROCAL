import { beforeEach, describe, expect, it } from "vitest";
import * as c from "../../../src/integrations/api/b4Contracts";
import { notificationPageSchema, notificationSchema } from "../../../src/integrations/api/notifications";
import { arenaStateSchema, playerRankPageSchema } from "../../../src/integrations/api/arena";
import { dlxBalanceSchema } from "../../../src/integrations/api/dlx";
const api = "http://127.0.0.1:8792";
async function control(body: object) {
  const response = await fetch(`${api}/__b2_test__`, { method: "POST", body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Isolated control failed");
  return response.json();
}
type Actor = { player: string; initData: string };
let actor: Actor;
async function call(path: string, body?: object, key?: string, identity = actor) {
  const response = await fetch(`${api}/api/v1${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `tma ${identity.initData}`, "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json(), headers: response.headers };
}
describe.skipIf(!process.env.B4_BACKEND_ROOT)("published B4 implementation", () => {
  beforeEach(async () => { actor = await control({ action: "player", points: 0 }); });
  it("returns confirmed ledger identity/progression once and preserves duplicate settlement", async () => {
    const claim = await call("/daily/claim", {});
    expect(claim.status).toBe(200);
    expect(claim.headers.get("Cache-Control")).toBe("private, no-store");
    const first = c.dailyClaimSchema.parse(claim.data);
    expect(first.reward?.created).toBe(true);
    expect(first.reward?.amount).toBe(first.reward_amount);
    expect(first.reward?.progression_before.lifetime_points).toBe(0);
    expect(first.reward?.progression_after).toEqual(first.canonical.progression);
    const duplicate = c.dailyClaimSchema.parse((await call("/daily/claim", {})).data);
    expect(duplicate.reward?.event_id).toBe(first.reward?.event_id);
    expect(duplicate.reward?.ledger_ids).toEqual(first.reward?.ledger_ids);
    expect(duplicate.reward?.created).toBe(false);
    expect((await control({ action: "inspect", player: actor.player })).lifetime).toBe(first.reward_amount);
  });
  it("reads real submitted Typing history, isolates cursors and distinguishes score from wallet credit", async () => {
    expect(c.typingHistorySchema.parse((await call("/typing/history")).data).items).toEqual([]);
    const started = c.attemptSchema.parse((await call("/typing/attempts/start", {}, "b4-run")).data);
    expect(c.typingHistorySchema.parse((await call("/typing/history")).data).items).toEqual([]);
    await control({ action: "b3-attempt-time", player: actor.player, seconds: 8 });
    const submitted = c.submitSchema.parse((await call(`/typing/attempts/${started.attempt_id}/submit`, { typed_text: started.phrase_text })).data);
    const history = c.typingHistorySchema.parse((await call("/typing/history?limit=1")).data);
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({ attempt_id: started.attempt_id, wpm: submitted.wpm, accuracy_bps: submitted.accuracy_bps, score: submitted.score, reward_amount: submitted.reward_amount, claimed: false });
    expect(c.submitSchema.parse((await call(`/typing/attempts/${started.attempt_id}/submit`, { typed_text: started.phrase_text })).data).created).toBe(false);
    const other = await control({ action: "player", points: 0 });
    expect(c.typingHistorySchema.parse((await call("/typing/history?cursor=999999&limit=1", undefined, undefined, other)).data).items).toEqual([]);
    const claim = c.typingClaimSchema.parse((await call("/typing/claim", {}, "b4-wallet")).data);
    expect(claim.reward?.amount).toBe(submitted.reward_amount);
    expect(c.typingHistorySchema.parse((await call("/typing/history")).data).items[0].claimed).toBe(true);
    expect(c.typingClaimSchema.parse((await call("/typing/claim", {}, "b4-wallet")).data).reward?.created).toBe(false);
    expect(c.typingClaimSchema.parse((await call("/typing/claim", {}, "b4-empty")).data).reward).toBeNull();
  });
  it("paginates real notifications, excludes bot-private items and marks all actor rows read", async () => {
    const seeded = await control({ action: "b4-notifications", player: actor.player, count: 3 });
    const first = notificationPageSchema.parse((await call("/notifications?limit=1")).data);
    expect(first.unread_count).toBe(3); expect(first.items).toHaveLength(1);
    expect(first.items[0].deep_link?.path).toBe("/clan");
    expect(first.items[0].payload.url).toBe("javascript:alert(1)");
    const second = notificationPageSchema.parse((await call(`/notifications?limit=1&cursor=${first.next_cursor}`)).data);
    expect(second.items[0].id).not.toBe(first.items[0].id);
    const other = await control({ action: "player", points: 0 });
    expect((await call(`/notifications/${seeded.ids[0]}/read`, {}, undefined, other)).status).toBe(404);
    expect(notificationSchema.parse((await call(`/notifications/${first.items[0].id}/read`, {})).data).unread).toBe(false);
    expect((await call("/notifications/read-all", {})).data).toEqual({ updated_count: 2, unread_count: 0 });
    expect((await call("/notifications/read-all", {})).data).toEqual({ updated_count: 0, unread_count: 0 });
    expect(notificationPageSchema.parse((await call("/notifications")).data).items.every(row => !row.unread && row.type !== "BOT_PRIVATE")).toBe(true);
  });
  it("returns a private cached image for start-only invitees and preserves nullable group fallback", async () => {
    const referral = c.referralSchema.parse((await call("/referrals")).data);
    const invited = await control({ action: "player", points: 0, cached_avatar: true, start_only: true });
    await control({ action: "b3-attribution", player: invited.player, code: referral.code });
    const invites = c.inviteesSchema.parse((await call("/referrals/invitees?limit=30")).data);
    expect(invites.items).toHaveLength(1);
    expect(invites.items[0].status).toBe("PENDING");
    expect(invites.items[0].photo_url).toMatch(/^https:\/\/cached-avatar\.test\//);
    expect(JSON.stringify(invites)).not.toContain(settingsToken);
    expect(c.groupsSchema.parse((await call("/network/groups")).data).items).toEqual([]);
    expect((await call("/typing/history?limit=0")).status).toBe(422);
  });
  it("reads archived standings and off-chain allocations through typed APIs without an archive UI", async () => {
    expect((await call("/bootstrap")).status).toBe(200);
    const archived = await control({ action: "b4-archive", player: actor.player });
    const state = arenaStateSchema.parse((await call("/arena/state")).data);
    expect(state.seasons.some(row => row.code === archived.season)).toBe(true);
    const response = await call(`/arena/rankings/players?season=${archived.season}&limit=1`);
    expect(response.status, JSON.stringify(response.data)).toBe(200);
    const page = playerRankPageSchema.parse(response.data);
    expect(page).toMatchObject({ season: archived.season, archived: true, next_offset: null, total_count: 1 });
    expect(page.own_standing?.season_points).toBe(42);
    expect(dlxBalanceSchema.parse((await call(`/arena/dlx?season=${archived.season}`)).data)).toMatchObject({ confirmed: 0, claimable: 0, claimable_enabled: false, transferable: false });
    expect((await call("/arena/rankings/players?season=unknown-season")).status).toBe(409);
  });
  it("keeps TODAY pagination in the server Typing period and rejects stale or foreign anchors at rollover", async () => {
    for (let index = 0; index < 2; index++) {
      const run = c.attemptSchema.parse((await call("/typing/attempts/start", {}, `period-${index}`)).data);
      await control({ action: "b3-attempt-time", player: actor.player, seconds: 8 });
      expect((await call(`/typing/attempts/${run.attempt_id}/submit`, { typed_text: run.phrase_text })).status).toBe(200);
    }
    const first = c.currentTypingHistorySchema.parse((await call("/typing/history?period=current&limit=1")).data);
    expect(first.next_cursor).not.toBeNull();
    expect(first.items[0].reset_period).toBe(first.period_key);
    const second = c.currentTypingHistorySchema.parse((await call(`/typing/history?period=current&limit=1&cursor=${first.next_cursor}`)).data);
    expect(second.items[0].reset_period).toBe(first.period_key);
    const now = await control({ action: "advance", seconds: 0 });
    await control({ action: "advance", seconds: (Date.parse(first.period_end) - Date.parse(now.server_time)) / 1000 + 0.1 });
    actor.initData = (await control({ action: "credentials", player: actor.player })).initData;
    const current = c.currentTypingHistorySchema.parse((await call("/typing/history?period=current")).data);
    expect(current.period_key).not.toBe(first.period_key); expect(current.items).toEqual([]);
    const stale = await call(`/typing/history?period=current&cursor=${first.next_cursor}`);
    expect(stale.status).toBe(409); expect(stale.data.code).toBe("TYPING_PERIOD_CHANGED");
    const other = await control({ action: "player", points: 0 });
    expect((await call(`/typing/history?period=current&cursor=${first.next_cursor}`, undefined, undefined, other)).status).toBe(422);
    expect(c.typingHistorySchema.parse((await call("/typing/history?period=all")).data).items).toHaveLength(2);
  });
});
const settingsToken = "123456:isolated-b2-test-only";
