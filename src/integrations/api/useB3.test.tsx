import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import fixture from "./fixtures/b3/earn-network.json";
import b4 from "./fixtures/b4/profile-earn.json";
import { remoteBootstrapSchema, configCacheScope } from "./bootstrapContract";
import { mapRemoteBootstrap } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { canonicalKey } from "./canonical";
import { useB3 } from "./useB3";
import { analytics } from "@/integrations/analytics/analytics";
const remote = remoteBootstrapSchema.parse(fixture.bootstrap);
const scope = {
  session: 1,
  player: "9001",
  season: remote.season!.code,
  config: configCacheScope(remote.config),
};
vi.mock("./BootstrapProvider", () => ({
  useBootstrap: () => ({
    scope,
    authorityReady: true,
    bootstrap: { data: mapRemoteBootstrap(remote, "telegram", null, null) },
  }),
}));
vi.mock("./bootstrap", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./bootstrap")>()),
  isRemoteDataSource: () => true,
}));
vi.mock("./b3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./b3")>()),
  b3Request: vi.fn(),
}));
import { b3Request, B3Error } from "./b3";
const request = vi.mocked(b3Request);
function setup(post: (path: string, options: any) => Promise<any>, missionRows: unknown = fixture.mission_list) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(
    queryKeys.bootstrap(1, "remote", "new-user", "telegram"),
    mapRemoteBootstrap(remote, "telegram", null, null),
  );
  const reads: Record<string, unknown> = {
    "/daily": fixture.daily_available,
    "/missions": missionRows,
    "/typing": { ...fixture.typing_state, claimable_balance: fixture.typing_claim.response.amount },
    "/typing/history?period=current&limit=20": { period: "current", period_key: "2026-10-15T00:00:00+00:00", period_start: "2026-10-15T00:00:00Z", period_end: "2026-10-16T00:00:00Z", items: [], next_cursor: null },
    "/referrals": fixture.referral,
    "/referrals/invitees?offset=0&limit=30": fixture.invitees_empty,
    "/network": fixture.network_summary,
    "/network/groups?offset=0&limit=30": fixture.network_groups_empty,
    "/rewards/state": fixture.canonical_state,
  };
  request.mockImplementation(async (path, _schema, options) =>
    options?.body === undefined ? reads[path] : post(path, options),
  );
  const hook = renderHook(() => useB3(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  return { ...hook, client, reads };
}
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
it("coalesces repeated Daily clicks and never commits an optimistic reward", async () => {
  const track = vi.spyOn(analytics, "featureFor");
  let finish!: (v: unknown) => void;
  const gate = new Promise((resolve) => {
    finish = resolve;
  });
  let posts = 0;
  const h = setup(async () => {
    posts++;
    return gate;
  });
  await waitFor(() =>
    expect(h.result.current.daily.data?.claimable).toBe(true),
  );
  await waitFor(() =>
    expect(h.client.getQueryData(canonicalKey(scope))).toBeTruthy(),
  );
  let action!: Promise<unknown>;
  act(() => {
    action = h.result.current.claimDaily();
    void h.result.current.claimDaily();
  });
  expect(posts).toBe(1);
  expect(h.client.getQueryData(canonicalKey(scope))).toMatchObject({
    progression: { lifetime_points: 270 },
  });
  await act(async () => {
    finish(fixture.daily_duplicate.response);
    await action;
  });
  expect(h.result.current.message).toBeNull();
  expect(h.result.current.rewardEvent).toBeNull();
  expect(track).not.toHaveBeenCalled(); track.mockRestore();
  h.unmount();
  h.client.clear();
});
it("captures newly confirmed Daily claims once and excludes errors and duplicate responses", async () => {
  const track = vi.spyOn(analytics, "featureFor");
  let fail = true;
  let duplicate = false;
  const h = setup(async () => {
    if (fail) throw new Error("network failure");
    return { ...fixture.daily_claim.response, created: !duplicate };
  });
  await waitFor(() => expect(h.result.current.daily.data?.claimable).toBe(true));
  await act(async () => { await h.result.current.claimDaily(); });
  expect(track).not.toHaveBeenCalled();
  fail = false;
  await act(async () => { await h.result.current.claimDaily(); });
  expect(track).toHaveBeenCalledExactlyOnceWith(scope.player, scope.session, "daily_reward_claimed", fixture.daily_claim.response.claim_period);
  duplicate = true;
  await act(async () => { await h.result.current.claimDaily(); });
  expect(track).toHaveBeenCalledTimes(1);
  track.mockRestore(); h.unmount(); h.client.clear();
});
it("tracks confirmed mission/typing results and Network intents without forwarding text, tokens or destinations", async () => {
  const track = vi.spyOn(analytics, "featureFor");
  let typingCreated = true;
  const h = setup(async path => {
    if (path.endsWith("/claim")) return fixture.mission_claim.response;
    if (path.endsWith("/submit")) return { ...fixture.typing_submit.response, created: typingCreated };
    if (path === "/network/groups/intents") return { url: "https://t.me/test?start=PRIVATE_INTENT" };
    return fixture.mission_start.response;
  });
  await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
  await act(async () => { await h.result.current.missionAction("visit-dalexio"); });
  expect(track).not.toHaveBeenCalled(); // Opening a mission is not claiming it.
  act(() => { h.client.setQueryData([...queryKeys.player(scope), "b3", "missions"], [{ ...fixture.mission_list[0], state: "REWARD_READY" }]); });
  await waitFor(() => expect(h.result.current.missions.data?.[0].state).toBe("REWARD_READY"));
  await act(async () => { await h.result.current.missionAction("visit-dalexio"); });
  await act(async () => { await h.result.current.submitTyping("attempt-1", "PRIVATE_TYPED_INPUT"); });
  typingCreated = false;
  await act(async () => { await h.result.current.submitTyping("attempt-1", "PRIVATE_TYPED_INPUT"); });
  await act(async () => { await h.result.current.registerGroup(); });
  expect(track.mock.calls.map(call => call[2])).toEqual(["mission_claimed", "typing_session_completed", "network_group_registration_initiated"]);
  expect(JSON.stringify(track.mock.calls)).not.toContain("PRIVATE");
  track.mockRestore(); h.unmount(); h.client.clear();
});
it("retains a lost Typing claim key across unmount, then replays the original key", async () => {
  const keys: string[] = [];
  let h = setup(async (_path, options) => {
    keys.push(options.key);
    throw new TypeError("lost response");
  });
  await waitFor(() => expect(h.result.current.typing.data).toBeTruthy());
  await act(async () => {
    await h.result.current.claimTyping();
  });
  expect(h.result.current.message).toContain("couldn't connect");
  h.unmount();
  h.client.clear();
  h = setup(async (_path, options) => {
    keys.push(options.key);
    return fixture.typing_duplicate_claim.response;
  });
  await waitFor(() => expect(h.result.current.typing.data).toBeTruthy());
  await act(async () => {
    await h.result.current.claimTyping();
  });
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect(
    localStorage.getItem(
      `dexo-b3-request:${scope.player}:${scope.season}:typing-claim`,
    ),
  ).toBeNull();
  h.unmount();
  h.client.clear();
});
it("keeps Telegram verification failures recoverable without claiming XP", async () => {
  const h = setup(async () => {
    throw new B3Error("TELEGRAM_VERIFICATION_UNAVAILABLE", 2);
  });
  await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
  await act(async () => {
    await h.result.current.missionAction("visit-dalexio");
  });
  expect(h.result.current.message).toContain("membership");
  expect(h.result.current.busy).toBe(false);
  h.unmount();
  h.client.clear();
});

it("reveals only newly confirmed exact XP, once, and never on refetch or duplicate", async () => {
  const h = setup(async () => fixture.daily_claim.response);
  await waitFor(() => expect(h.result.current.daily.data).toBeTruthy());
  expect(h.result.current.rewardEvent).toBeNull();
  await act(async () => { await h.result.current.claimDaily(); });
  expect(h.result.current.rewardEvent).toMatchObject({ xp: fixture.daily_claim.response.reward_amount, title: "Daily Core" });
  act(() => h.result.current.dismissReward());
  await act(async () => { await h.result.current.refresh(); await h.result.current.claimDaily(); });
  expect(h.result.current.rewardEvent).toBeNull();
  expect(h.result.current.message).toBeNull();
  h.unmount(); h.client.clear();
});

it("isolates mission pending state from Daily and queues the existing level reveal after settlement", async () => {
  const response = structuredClone(fixture.mission_claim.response);
  response.canonical = { ...response.canonical, receipt_cursor: 4, progression: { ...response.canonical.progression, level: 5, lifetime_points: 2610, current_threshold: 2500, next_threshold: 3800, points_into_level: 110, points_remaining: 1190, dexo_stage: "explorer" } };
  let finish!: (v: unknown) => void;
  const gate = new Promise(resolve => { finish = resolve; });
  const h = setup(async () => gate);
  await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
  act(() => h.client.setQueryData([...queryKeys.player(scope), "b3", "missions"], fixture.mission_list.map(m => ({ ...m, state: m.key === response.key ? "REWARD_READY" : m.state }))));
  await waitFor(() => expect(h.result.current.missions.data?.find(m => m.key === response.key)?.state).toBe("REWARD_READY"));
  act(() => h.client.setQueryData(canonicalKey(scope), { ...fixture.canonical_state, progression: { ...fixture.canonical_state.progression, lifetime_points: 2490, level: 4, current_threshold: 1500, next_threshold: 2500, points_into_level: 990, points_remaining: 10 } }));
  let action!: Promise<unknown>;
  act(() => { action = h.result.current.missionAction(response.key); });
  await waitFor(() => expect(h.result.current.pendingAction).toBe(`mission:${response.key}`));
  expect(h.result.current.daily.data?.claimable).toBe(true);
  expect(h.result.current.rewardEvent).toBeNull();
  await act(async () => { finish(response); await action; });
  expect(h.result.current.rewardEvent?.xp).toBe(response.reward_amount);
  expect(h.result.current.levelUpEvent).toMatchObject({ previousLevel: 4, newLevel: 5, evolution: true, evolutionTitle: "Explorer" });
  expect(h.result.current.pendingAction).toBeNull();
  h.unmount(); h.client.clear();
});

it("settles independent actions concurrently without changing Daily's pending state or losing either reveal", async () => {
  let finishDaily!: (v: unknown) => void;
  let finishTyping!: (v: unknown) => void;
  const dailyGate = new Promise(resolve => { finishDaily = resolve; });
  const typingGate = new Promise(resolve => { finishTyping = resolve; });
  const typingResponse = structuredClone(fixture.typing_claim.response);
  const dailyResponse = structuredClone(fixture.daily_claim.response);
  typingResponse.canonical.progression.level = 2;
  dailyResponse.canonical.progression.level = 2;
  const h = setup(async path => path === "/daily/claim" ? dailyGate : typingGate);
  await waitFor(() => expect(h.result.current.typing.data).toBeTruthy());
  let daily!: Promise<unknown>, typing!: Promise<unknown>;
  act(() => { daily = h.result.current.claimDaily(); typing = h.result.current.claimTyping(); });
  await waitFor(() => expect(h.result.current.isPending("daily")).toBe(true));
  expect(h.result.current.isPending("typing-claim")).toBe(true);
  await act(async () => { finishTyping(typingResponse); await typing; });
  expect(h.result.current.isPending("daily")).toBe(true);
  expect(h.result.current.rewardEvent?.xp).toBe(70);
  expect(h.result.current.levelUpEvent?.newLevel).toBe(2);
  await act(async () => { finishDaily(dailyResponse); await daily; });
  act(() => h.result.current.dismissReward());
  expect(h.result.current.rewardEvent).toBeNull();
  act(() => h.result.current.dismissLevelUp());
  expect(h.result.current.rewardEvent?.xp).toBe(80);
  expect(h.result.current.levelUpEvent).toBeNull();
  act(() => h.result.current.dismissReward());
  expect(h.result.current.rewardEvent).toBeNull();
  expect(h.client.getQueryData(canonicalKey(scope))).toMatchObject({ receipt_cursor: 3 });
  h.unmount(); h.client.clear();
});

it("deduplicates published ledger events across remounts and never reveals a null B4 receipt", async () => {
  let response: unknown = b4.daily_claim;
  let h = setup(async () => response);
  await waitFor(() => expect(h.result.current.daily.data).toBeTruthy());
  await act(async () => { await h.result.current.claimDaily(); });
  expect(h.result.current.rewardEvent).toMatchObject({ id: b4.daily_claim.reward.event_id, xp: b4.daily_claim.reward.amount });
  h.unmount(); h.client.clear();
  h = setup(async () => response);
  await waitFor(() => expect(h.result.current.daily.data).toBeTruthy());
  await act(async () => { await h.result.current.claimDaily(); });
  expect(h.result.current.rewardEvent).toBeNull();
  response = { ...b4.daily_claim, reward: null };
  localStorage.clear();
  await act(async () => { await h.result.current.claimDaily(); });
  expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});

const telegramMission = { ...fixture.mission_list[0], key: "join-reviewed-channel", title: "Join the reviewed channel", verification_family: "TELEGRAM", destination_url: "https://t.me/reviewed_channel", state: "AVAILABLE" };
const telegramStart = { ...fixture.mission_start.response, key: telegramMission.key, destination_url: null, open_token: null };

async function telegramSetup(post: (path: string, options: any) => Promise<any>, initial = telegramMission) {
  const h = setup(post, [initial]);
  await waitFor(() => expect(h.result.current.missions.data?.[0].key).toBe(initial.key));
  return h;
}
it("opens Telegram from the matching refreshed list after a successful null-destination Start without verification or reward", async () => {
  const h = await telegramSetup(async () => {
    h.reads["/missions"] = [{ ...telegramMission, state: "IN_PROGRESS" }];
    return telegramStart;
  });
  let next: unknown;
  await act(async () => { next = await h.result.current.missionAction(telegramMission.key); });
  expect(next).toEqual({ destination: telegramMission.destination_url, action: "external" });
  expect(h.result.current.missions.data?.[0].state).toBe("IN_PROGRESS");
  expect(request.mock.calls.filter(c => c[2]?.body !== undefined).map(c => c[0])).toEqual([`/missions/${telegramMission.key}/start`]);
  expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});
it("reopens an in-progress Telegram destination with a fresh matching definition and no Start or Verify", async () => {
  const h = await telegramSetup(async () => { throw new Error("Unexpected mutation"); }, { ...telegramMission, state: "IN_PROGRESS" });
  let next: unknown;
  await act(async () => { next = await h.result.current.missionAction(telegramMission.key, "reopen"); });
  expect(next).toEqual({ destination: telegramMission.destination_url, action: "external" });
  expect(request.mock.calls.filter(c => c[2]?.body !== undefined)).toEqual([]);
  h.unmount(); h.client.clear();
});
it("retains TIMED_EXTERNAL Start destinations and open-token verification semantics", async () => {
  const token = "server-open-token";
  const destination = "https://reviewed-partner.example/offer?campaign=phase4";
  const h = setup(async path => path.endsWith("/start") ? { ...fixture.mission_start.response, open_token: token, destination_url: destination } : fixture.mission_dwell_wait.response);
  await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
  let next: unknown;
  await act(async () => { next = await h.result.current.missionAction("visit-dalexio"); });
  expect(next).toEqual({ destination, action: "external" });
  h.reads["/missions"] = [{ ...fixture.mission_list[0], state: "IN_PROGRESS" }];
  await act(async () => { await h.result.current.missions.refetch(); });
  await waitFor(() => expect(h.result.current.missions.data?.[0].state).toBe("IN_PROGRESS"));
  await act(async () => { await h.result.current.missionAction("visit-dalexio"); });
  expect(request.mock.calls.find(c => c[0].endsWith("/verify"))?.[2]?.body).toEqual({ open_token: token });
  expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});
it("never returns a destination after failed Start", async () => {
  const h = await telegramSetup(async () => { throw new Error("Start failed"); });
  let next: unknown;
  await act(async () => { next = await h.result.current.missionAction(telegramMission.key); });
  expect(next).toBeUndefined();
  expect(h.result.current.missions.data?.[0].state).toBe("AVAILABLE");
  expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});
it.each([
  { key: "another-key" }, { version: 2 }, { state: "CLAIMED" },
])("rejects a mismatched Start response: %j", mismatch => {
  return (async () => {
    const h = await telegramSetup(async () => ({ ...telegramStart, ...mismatch }));
    let next: unknown;
    await act(async () => { next = await h.result.current.missionAction(telegramMission.key); });
    expect(next).toBeUndefined(); expect(h.result.current.message).toContain("mission changed");
    expect(h.result.current.rewardEvent).toBeNull();
    h.unmount(); h.client.clear();
  })();
});
it.each([
  [], [{ ...telegramMission, version: 2, state: "IN_PROGRESS" }],
  [{ ...telegramMission, key: "replacement-key", state: "IN_PROGRESS" }],
  [{ ...telegramMission, destination_url: "https://t.me/changed_channel", state: "IN_PROGRESS" }],
  [{ ...telegramMission, verification_family: "TIMED_EXTERNAL", state: "IN_PROGRESS" }],
  [{ ...telegramMission, available: false, state: "IN_PROGRESS" }],
].map(rows => ({ rows })))("fails safely when the refreshed Telegram definition differs: %j", ({ rows }) => {
  return (async () => {
    const h = await telegramSetup(async () => { h.reads["/missions"] = rows; return telegramStart; });
    let next: unknown;
    await act(async () => { next = await h.result.current.missionAction(telegramMission.key); });
    expect(next).toBeUndefined(); expect(h.result.current.message).toBeTruthy();
    expect(h.result.current.rewardEvent).toBeNull();
    h.unmount(); h.client.clear();
  })();
});
it.each([null, "javascript:alert(1)", "https://t.me.evil.example/channel", "https://t.me/", "https://user:pass@t.me/channel", "https://t.me/%0aevil"])("never returns a missing or unsafe Telegram destination: %s", async destination_url => {
  const initial = { ...telegramMission, destination_url } as typeof telegramMission;
  const h = await telegramSetup(async () => { h.reads["/missions"] = [{ ...initial, state: "IN_PROGRESS" }]; return telegramStart; }, initial);
  let next: unknown;
  await act(async () => { next = await h.result.current.missionAction(telegramMission.key); });
  expect(next).toBeUndefined(); expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});
it("refuses stale destinations when the list refresh fails", async () => {
  const h = await telegramSetup(async () => telegramStart);
  const original = request.getMockImplementation()!;
  request.mockImplementation(async (path, schema, options) => {
    if (path === "/missions") throw new Error("Mission read failed");
    return original(path, schema, options);
  });
  let next: unknown;
  await act(async () => { next = await h.result.current.missionAction(telegramMission.key); });
  expect(next).toBeUndefined(); expect(h.result.current.message).toContain("couldn't be refreshed");
  h.unmount(); h.client.clear();
});
