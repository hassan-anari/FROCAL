import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import fixture from "./fixtures/b3/earn-network.json";
import two from "./fixtures/phase4/registered-2.json";
import { mapRemoteBootstrap } from "./bootstrap";
import { remoteBootstrapSchema } from "./bootstrapContract";
import { useB3 } from "./useB3";
const state = { authorityReady: true, denials: 0, payload: mapRemoteBootstrap(remoteBootstrapSchema.parse(fixture.bootstrap), "telegram", null, null) };
vi.mock("./BootstrapProvider", () => ({ useBootstrap: () => ({ scope: { session: 1, player: "9001", season: "phase4-s1", config: "isolated" }, authorityReady: state.authorityReady, denyEarning: () => { state.authorityReady = false; state.denials++; }, bootstrap: { data: state.payload } }) }));
vi.mock("./bootstrap", async original => ({ ...await original<typeof import("./bootstrap")>(), isRemoteDataSource: () => true }));
vi.mock("./b3", async original => ({ ...await original<typeof import("./b3")>(), b3Request: vi.fn() }));
import { b3Request, B3Error } from "./b3";
const request = vi.mocked(b3Request);
afterEach(() => { vi.clearAllMocks(); localStorage.clear(); });
function setup(status: string, allowed: boolean, cutoff = false) {
  state.authorityReady = true; state.denials = 0;
  const remote = remoteBootstrapSchema.parse({ ...fixture.bootstrap, server_time: two.server_time,
    season: { ...fixture.bootstrap.season, status, starts_at: two.season.starts_at, ends_at: two.season.ends_at, timing: two.season.timing },
    gameplay: { moderation_state: "ACTIVE", reward_earning_allowed: allowed } });
  if (!cutoff) remote.server_time = remote.season!.starts_at;
  state.payload = mapRemoteBootstrap(remote, "telegram", null, null);
  const ready = { ...fixture.mission_list[0], key: "new-vested-key", state: "REWARD_READY", available: false, verification_family: "INTERNAL", destination_url: null };
  const reads: Record<string, unknown> = { "/daily": fixture.daily_available, "/missions": [...fixture.mission_list, ready], "/typing": { ...fixture.typing_state, claimable_balance: 70 }, "/network": { ...fixture.network_summary, can_register: true } };
  request.mockImplementation(async (path, _schema, options) => options?.body === undefined ? reads[path] ?? {} : {});
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const hook = renderHook(() => useB3(), { wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
  return { ...hook, client };
}
for (const [status, allowed, cutoff] of [["ACTIVE", false, false], ["ACTIVE", true, true], ["CLOSED", true, false], ["ARCHIVED", true, false]] as const) {
  it(`forbids every new earning request for ${status}, grant=${allowed}, cutoff=${cutoff}`, async () => {
    const h = setup(status, allowed, cutoff);
    await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
    await act(async () => {
      await h.result.current.claimDaily();
      await h.result.current.startTyping();
      await h.result.current.submitTyping("attempt", "text");
      for (const m of fixture.mission_list.filter(m => ["AVAILABLE", "IN_PROGRESS"].includes(m.state))) await h.result.current.missionAction(m.key);
      await h.result.current.registerGroup();
      if (status !== "ACTIVE") { await h.result.current.claimTyping(); await h.result.current.missionAction("new-vested-key"); }
    });
    expect(request.mock.calls.filter(c => c[2]?.body !== undefined)).toEqual([]);
    expect(h.result.current.rewardEvent).toBeNull();
    h.unmount(); h.client.clear();
  });
}
it("preserves server-vested unknown Mission and Typing claims during Closing and coalesces duplicates", async () => {
  const h = setup("ACTIVE", false, true);
  await waitFor(() => expect(h.result.current.typing.data?.claimable_balance).toBe(70));
  const posts: string[] = [];
  let finish!: () => void;
  const gate = new Promise<void>(resolve => { finish = resolve; });
  const original = request.getMockImplementation()!;
  request.mockImplementation(async (path, schema, options) => {
    if (options?.body === undefined) return original(path, schema, options);
    posts.push(path); await gate; throw new Error("Isolated transport failure: no local reward");
  });
  let actions!: Promise<unknown>[];
  act(() => { actions = [h.result.current.claimTyping(), h.result.current.claimTyping(), h.result.current.missionAction("new-vested-key"), h.result.current.missionAction("new-vested-key")]; });
  expect(posts).toEqual(["/typing/claim", "/missions/new-vested-key/claim"]);
  await act(async () => { finish(); await Promise.all(actions); });
  expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});

it("a server earning rejection blocks later actions despite a stale positive Bootstrap sample", async () => {
  const h = setup("ACTIVE", true);
  await waitFor(() => expect(h.result.current.daily.data?.claimable).toBe(true));
  const original = request.getMockImplementation()!;
  let posts = 0;
  request.mockImplementation(async (path, schema, options) => {
    if (options?.body === undefined) return original(path, schema, options);
    posts++; throw new B3Error("SEASON_UNAVAILABLE", null);
  });
  await act(async () => { await h.result.current.claimDaily(); });
  expect(state.denials).toBe(1);
  await act(async () => { await h.result.current.claimDaily(); await h.result.current.startTyping(); await h.result.current.submitTyping("attempt", "text"); await h.result.current.registerGroup(); });
  expect(posts).toBe(1);
  expect(h.result.current.rewardEvent).toBeNull();
  h.unmount(); h.client.clear();
});

it("rechecks earning before verification when a Mission start response arrives after authority changes", async () => {
  const h = setup("ACTIVE", true);
  await waitFor(() => expect(h.result.current.missions.data).toBeTruthy());
  act(() => { h.client.setQueryData(["player", 1, "9001", "phase4-s1", "isolated", "b3", "missions"], [{ ...fixture.mission_list[0], state: "IN_PROGRESS" }]); });
  await waitFor(() => expect(h.result.current.missions.data?.[0].state).toBe("IN_PROGRESS"));
  let finish!: (value: unknown) => void;
  const gate = new Promise(resolve => { finish = resolve; });
  const original = request.getMockImplementation()!;
  const posts: string[] = [];
  request.mockImplementation(async (path, schema, options) => {
    if (options?.body === undefined) return original(path, schema, options);
    posts.push(path); return gate;
  });
  let action!: Promise<unknown>;
  act(() => { action = h.result.current.missionAction(fixture.mission_list[0].key); });
  state.authorityReady = false; h.rerender();
  await act(async () => { finish(fixture.mission_start.response); await action; });
  expect(posts).toEqual([`/missions/${fixture.mission_list[0].key}/start`]);
  h.unmount(); h.client.clear();
});
