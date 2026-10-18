import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { queryKeys } from "./queryKeys";
import { useRewardHistory, useNetworkRewardHistory } from "./useRewardHistory";
const state = vi.hoisted(() => ({ player: "9001", initData: "synthetic-auth", remote: true }));
vi.mock("./BootstrapProvider", () => ({ useBootstrap: () => ({ scope: { session: 1, player: state.player, season: "s1", config: "v1" }, bootstrap: { data: {} } }) }));
vi.mock("./bootstrap", () => ({ isRemoteDataSource: () => state.remote }));
vi.mock("@/integrations/telegram/TelegramProvider", () => ({ useTelegram: () => ({ adapter: { isTelegram: true, getInitData: () => state.initData } }) }));
vi.mock("./rewardHistory", async original => ({ ...(await original<typeof import("./rewardHistory")>()), loadRewardHistory: vi.fn() }));
import { loadRewardHistory } from "./rewardHistory";
const load = vi.mocked(loadRewardHistory);
const row = { id: 50, source_type: "DAILY", context: "PLAYER", player_amount: 80, occurred_at: "2026-10-16T10:10:00Z" };
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
afterEach(() => { vi.clearAllMocks(); state.player = "9001"; state.initData = "synthetic-auth"; state.remote = true; });
it("shares one read between Base/Earn, paginates and isolates the next player", async () => {
  load.mockImplementation(async (_auth, cursor) => cursor === null ? { items: [row], next_cursor: 50 } : { items: [{ ...row, id: 49 }], next_cursor: null });
  const { client, wrapper } = setup();
  const base = renderHook(() => useRewardHistory(), { wrapper });
  const earn = renderHook(() => useRewardHistory(), { wrapper });
  await waitFor(() => expect(base.result.current.items).toHaveLength(1));
  expect(load).toHaveBeenCalledTimes(1);
  await act(() => earn.result.current.fetchNextPage());
  await waitFor(() => expect(base.result.current.items.map(item => item.id)).toEqual([50, 49]));
  state.player = "9002";
  let resolve!: (value: any) => void;
  load.mockImplementation(() => new Promise(done => { resolve = done; }));
  base.rerender();
  expect(base.result.current.items).toEqual([]);
  await act(async () => resolve({ items: [], next_cursor: null }));
  expect(base.result.current.items).toEqual([]);
  expect(client.getQueryData(queryKeys.rewardHistory({ session: 1, player: "9001", season: "s1", config: "v1" }))).toBeTruthy();
  base.unmount(); earn.unmount(); client.clear();
});
it.each(["unverified", "local", "no-auth"])("does not read remote private history when %s", async condition => {
  if (condition === "unverified") state.player = "unverified";
  if (condition === "local") state.remote = false;
  if (condition === "no-auth") state.initData = "";
  const { client, wrapper } = setup();
  const hook = renderHook(() => useRewardHistory(), { wrapper });
  expect(hook.result.current.items).toEqual([]);
  expect(load).not.toHaveBeenCalled(); hook.unmount(); client.clear();
});
it("exposes errors without local rewards and prevents repeated or increasing cursors", async () => {
  load.mockResolvedValueOnce({ items: [row], next_cursor: 50 }).mockResolvedValueOnce({ items: [row], next_cursor: 50 });
  const { client, wrapper } = setup(); const hook = renderHook(() => useRewardHistory(), { wrapper });
  await waitFor(() => expect(hook.result.current.hasNextPage).toBe(true));
  await act(() => hook.result.current.fetchNextPage());
  await waitFor(() => expect(hook.result.current.hasNextPage).toBe(false));
  load.mockRejectedValue(new Error("backend unavailable"));
  await act(() => hook.result.current.refetch());
  await waitFor(() => expect(hook.result.current.isError).toBe(true));
  expect(hook.result.current.items).toHaveLength(1); hook.unmount(); client.clear();
});
it("blocks duplicate manual/intersection pagination and retains rows through an in-flight next page", async () => {
  load.mockResolvedValueOnce({ items: [row], next_cursor: 50 });
  const { client, wrapper } = setup(); const hook = renderHook(() => useRewardHistory(), { wrapper });
  await waitFor(() => expect(hook.result.current.items).toHaveLength(1));
  let finish!: (value: any) => void;
  load.mockImplementationOnce(() => new Promise(done => { finish = done; }));
  let first!: Promise<unknown>;
  act(() => { first = hook.result.current.fetchNextPage(); void hook.result.current.fetchNextPage(); });
  expect(load).toHaveBeenCalledTimes(2); expect(hook.result.current.items).toEqual([row]);
  await act(async () => { finish({ items: [{ ...row, id: 49 }], next_cursor: null }); await first; });
  await waitFor(() => expect(hook.result.current.items.map(item => item.id)).toEqual([50, 49]));
  hook.unmount(); client.clear();
});
it("coalesces foreground refresh and keeps confirmed rows during that refresh", async () => {
  load.mockResolvedValueOnce({ items: [row], next_cursor: null });
  const { client, wrapper } = setup(); const hook = renderHook(() => useRewardHistory(), { wrapper });
  await waitFor(() => expect(hook.result.current.items).toEqual([row]));
  let finish!: (value: any) => void;
  load.mockImplementationOnce(() => new Promise(done => { finish = done; }));
  act(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  expect(load).toHaveBeenCalledTimes(2); expect(hook.result.current.items).toEqual([row]);
  await act(async () => { finish({ items: [row], next_cursor: null }); });
  hook.unmount(); client.clear();
});

it("separates Network and Base caches and resets pagination when changing category", async () => {
  load.mockImplementation(async (_auth, _cursor, _signal, category) => ({ items: [{ ...row, source_type: category === "network" ? "CREATOR" : "DAILY" }], next_cursor: null }));
  const { client, wrapper } = setup();
  const base = renderHook(() => useRewardHistory(), { wrapper });
  const network = renderHook(() => useNetworkRewardHistory(), { wrapper });
  await waitFor(() => expect(base.result.current.items[0]?.source_type).toBe("DAILY"));
  await waitFor(() => expect(network.result.current.items[0]?.source_type).toBe("CREATOR"));
  expect(load).toHaveBeenCalledTimes(2);
  const next = renderHook(() => useNetworkRewardHistory(), { wrapper });
  expect(next.result.current.items[0]?.source_type).toBe("CREATOR"); expect(load).toHaveBeenCalledTimes(2);
  base.unmount(); network.unmount(); next.unmount(); client.clear();
});
