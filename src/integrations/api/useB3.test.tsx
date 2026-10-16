import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import fixture from "./fixtures/b3/earn-network.json";
import { remoteBootstrapSchema, configCacheScope } from "./bootstrapContract";
import { mapRemoteBootstrap } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { canonicalKey } from "./canonical";
import { useB3 } from "./useB3";
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
function setup(post: (path: string, options: any) => Promise<any>) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  client.setQueryData(
    queryKeys.bootstrap(1, "remote", "new-user", "telegram"),
    mapRemoteBootstrap(remote, "telegram", null, null),
  );
  const reads: Record<string, unknown> = {
    "/daily": fixture.daily_available,
    "/missions": fixture.mission_list,
    "/typing": fixture.typing_state,
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
  return { ...hook, client };
}
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
it("coalesces repeated Daily clicks and never commits an optimistic reward", async () => {
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
  h.unmount();
  h.client.clear();
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
  response.canonical = { ...response.canonical, receipt_cursor: 4, progression: { ...response.canonical.progression, level: 2, lifetime_points: 350, current_threshold: 300, next_threshold: 800, points_into_level: 50, points_remaining: 450 } };
  let finish!: (v: unknown) => void;
  const gate = new Promise(resolve => { finish = resolve; });
  const h = setup(async () => gate);
  await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
  act(() => h.client.setQueryData([...queryKeys.player(scope), "b3", "missions"], fixture.mission_list.map(m => ({ ...m, state: m.key === response.key ? "REWARD_READY" : m.state }))));
  await waitFor(() => expect(h.result.current.missions.data?.find(m => m.key === response.key)?.state).toBe("REWARD_READY"));
  let action!: Promise<unknown>;
  act(() => { action = h.result.current.missionAction(response.key); });
  await waitFor(() => expect(h.result.current.pendingAction).toBe(`mission:${response.key}`));
  expect(h.result.current.daily.data?.claimable).toBe(true);
  expect(h.result.current.rewardEvent).toBeNull();
  await act(async () => { finish(response); await action; });
  expect(h.result.current.rewardEvent?.xp).toBe(response.reward_amount);
  expect(h.result.current.levelUpEvent).toMatchObject({ previousLevel: 1, newLevel: 2 });
  expect(h.result.current.pendingAction).toBeNull();
  h.unmount(); h.client.clear();
});
