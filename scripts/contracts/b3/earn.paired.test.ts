import { beforeEach, afterEach, expect, it, vi } from "vitest";
import * as c from "../../../src/integrations/api/b3Contracts";
const api = "http://127.0.0.1:8792";
async function control(data: object) {
  const r = await fetch(`${api}/__b2_test__`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!r.ok) throw Error("Isolated control failed");
  return r.json();
}
let identity: { player: string; initData: string };
async function call(path: string, body?: object, key?: string) {
  const r = await fetch(`${api}/api/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `tma ${identity.initData}`,
      "Content-Type": "application/json",
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await r.json();
  return { status: r.status, result };
}
beforeEach(async () => {
  await control({ action: "flags" });
  identity = await control({ action: "player", points: 150 });
});
afterEach(() => vi.unstubAllGlobals());
it("completes actual Daily claim/duplicate, UTC reset and streak without local XP", async () => {
  const state = c.dailySchema.parse((await call("/daily")).result);
  expect(state.claimable).toBe(true);
  const claim = c.dailyClaimSchema.parse(
    (await call("/daily/claim", {})).result,
  );
  expect(claim.canonical.progression.lifetime_points).toBe(
    150 + state.reward_amount,
  );
  expect(
    c.dailyClaimSchema.parse((await call("/daily/claim", {})).result).created,
  ).toBe(false);
  await control({ action: "advance", seconds: 86400 });
  identity.initData = (
    await control({ action: "credentials", player: identity.player })
  ).initData;
  const next = c.dailySchema.parse((await call("/daily")).result);
  expect(next.claimable).toBe(true);
  expect(next.cycle_day).toBe(2);
  expect(
    c.dailyClaimSchema.parse((await call("/daily/claim", {})).result).streak,
  ).toBe(2);
});
it("uses real mission start token/dwell, Telegram verification recovery and idempotent claim", async () => {
  const missions = (await call("/missions")).result.map((v: unknown) =>
    c.missionSchema.parse(v),
  );
  expect(
    missions.find((v: c.Mission) => v.key === "read-season-brief"),
  ).toMatchObject({ state: "UNAVAILABLE" });
  const open = c.missionStartSchema.parse(
    (await call("/missions/visit-dalexio/start", {})).result,
  );
  expect(
    (
      await call("/missions/visit-dalexio/verify", {
        open_token: open.open_token,
      })
    ).result.state,
  ).toBe("IN_PROGRESS");
  await control({ action: "advance", seconds: 7 });
  expect(
    (
      await call("/missions/visit-dalexio/verify", {
        open_token: open.open_token,
      })
    ).result.state,
  ).toBe("REWARD_READY");
  const claim = c.missionClaimSchema.parse(
    (await call("/missions/visit-dalexio/claim", {})).result,
  );
  expect(claim.canonical.progression.lifetime_points).toBe(
    150 + claim.reward_amount,
  );
  expect((await call("/missions/visit-dalexio/claim", {})).result.created).toBe(
    false,
  );
  await call("/missions/join-telegram/start", {});
  await control({
    action: "b3-membership",
    player: identity.player,
    unavailable: true,
  });
  expect(
    (await call("/missions/join-telegram/verify", { open_token: null })).result
      .code,
  ).toBe("TELEGRAM_VERIFICATION_UNAVAILABLE");
  await control({
    action: "b3-membership",
    player: identity.player,
    unavailable: false,
  });
  expect(
    (await call("/missions/join-telegram/verify", { open_token: null })).result
      .state,
  ).toBe("REWARD_READY");
});
it("issues/resumes/scores/submits once, claims once and reconciles every shared projection", async () => {
  const attempt = c.attemptSchema.parse(
    (await call("/typing/attempts/start", {}, "paired-start")).result,
  );
  expect(
    c.typingSchema.parse((await call("/typing")).result).active_attempt_detail
      ?.phrase_text,
  ).toBe(attempt.phrase_text);
  await control({
    action: "b3-attempt-time",
    player: identity.player,
    seconds: 8,
  });
  const submit = c.submitSchema.parse(
    (
      await call(`/typing/attempts/${attempt.attempt_id}/submit`, {
        typed_text: attempt.phrase_text,
      })
    ).result,
  );
  expect(submit.status).toBe("VALID");
  expect(
    (
      await call(`/typing/attempts/${attempt.attempt_id}/submit`, {
        typed_text: "different",
      })
    ).result.created,
  ).toBe(false);
  const claim = c.typingClaimSchema.parse(
    (await call("/typing/claim", {}, "paired-claim")).result,
  );
  expect(claim.canonical.progression.lifetime_points).toBe(
    150 + submit.reward_amount,
  );
  expect((await call("/typing/claim", {}, "paired-claim")).result.created).toBe(
    false,
  );
  for (const path of ["/bootstrap", "/profile/overview", "/network"])
    expect((await call(path)).result.canonical.progression).toEqual(
      claim.canonical.progression,
    );
  expect((await call("/rewards/state")).result.receipt_cursor).toBe(
    claim.canonical.receipt_cursor,
  );
});
it("retains immutable referral attribution and real pending counters and creator intent/registration", async () => {
  const referral = c.referralSchema.parse((await call("/referrals")).result);
  expect(referral.link).toContain(referral.code);
  const invitee = await control({ action: "player", points: 0 });
  await control({
    action: "b3-attribution",
    player: invitee.player,
    code: referral.code,
  });
  expect(
    c.referralSchema.parse((await call("/referrals")).result).pending_count,
  ).toBe(1);
  expect(
    c.inviteesSchema.parse((await call("/referrals/invitees")).result).items,
  ).toHaveLength(1);
  const intent = c.intentSchema.parse(
    (await call("/network/groups/intents", {})).result,
  );
  const token = new URL(intent.startgroup_url).searchParams.get("startgroup");
  const registered = await control({
    action: "b3-group",
    player: identity.player,
    token,
  });
  expect(registered.id).toBeTruthy();
  expect(
    c.groupsSchema.parse((await call("/network/groups")).result).items[0],
  ).toMatchObject({
    public_id: registered.id,
    state: "REVIEW",
    earned_points: 0,
  });
  expect(
    c.networkSchema.parse((await call("/network")).result).group_count,
  ).toBe(1);
  await control({action:"b3-group-verify",player:identity.player,id:registered.id,admin:false});
  expect(c.groupsSchema.parse((await call("/network/groups")).result).items[0].state).toBe("ADMIN_REQUIRED");
  await control({action:"b3-group-verify",player:identity.player,id:registered.id,admin:true});
  expect(c.groupsSchema.parse((await call("/network/groups")).result).items[0]).toMatchObject({state:"ACTIVE",bot_admin:true});
  expect(c.networkSchema.parse((await call("/network")).result).active_groups).toBe(1);
});

it("enforces disabled-default CMS banner schedules and immutable versioned delivery through the real backend", async () => {
  for (const state of ["absent", "disabled", "future", "expired"]) {
    await control({ action: "b3-banner", state });
    expect(c.bannerSchema.parse((await call("/content/banners/BASE")).result).banner).toBeNull();
  }
  await control({action:"b3-banner",state:"active"});
  const active = c.bannerSchema.parse((await call("/content/banners/BASE")).result).banner!;
  expect(active).toMatchObject({width:1200,height:260});
  const image = await fetch(api + new URL(active.image_url).pathname);
  expect(image.status).toBe(200);expect(image.headers.get("Content-Type")).toContain("image/webp");expect(image.headers.get("Cache-Control")).toContain("immutable");
  await control({action:"b3-banner",state:"absent"});
});
it("returns expired and ineligible Typing results without minting XP and keeps the attempt limit server-owned", async () => {
  const run = c.attemptSchema.parse((await call("/typing/attempts/start",{},"expired-run")).result);
  await control({action:"advance",seconds:31});
  const expired = c.submitSchema.parse((await call(`/typing/attempts/${run.attempt_id}/submit`,{typed_text:run.phrase_text})).result);
  expect(expired.status).toBe("EXPIRED");expect(expired.reward_amount).toBe(0);
  const next = c.attemptSchema.parse((await call("/typing/attempts/start",{},"invalid-run")).result);
  await control({action:"b3-attempt-time",player:identity.player,seconds:8});
  const invalid = c.submitSchema.parse((await call(`/typing/attempts/${next.attempt_id}/submit`,{typed_text:"wrong"})).result);
  expect(invalid.status).not.toBe("VALID");expect(invalid.reward_amount).toBe(0);expect(invalid.typing.claimable_balance).toBe(0);
  expect((await control({action:"inspect",player:identity.player})).lifetime).toBe(150);
});
