import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useArenaRankings } from "./useArenaRankings";
const native = vi.hoisted(() => ({ resume: null as (() => void) | null }));
vi.mock("./BootstrapProvider", () => ({ useBootstrap: () => ({ scope: { session: 1, player: "verified", season: "s1", config: "v1" }, bootstrap: { data: { featureFlags: { arena: true }, remote: { season: { code: "s1" } } } } }) }));
vi.mock("./bootstrap", () => ({ isRemoteDataSource: () => true }));
vi.mock("./arena", () => ({ loadRankings: vi.fn() }));
vi.mock("@/integrations/telegram/TelegramProvider", () => ({ useTelegram: () => ({ adapter: { subscribe: (_event: string, handler: () => void) => { native.resume = handler; return () => { native.resume = null; }; } } }) }));
vi.mock("@/design-system/components/TransientFeedback", () => ({ showFeedback: vi.fn() }));
import { loadRankings } from "./arena";
let client: QueryClient;
afterEach(() => { client?.clear(); vi.clearAllMocks(); });
it("consumes canonical ranks/counts unchanged and replaces stale live standings on native foreground", async () => {
  const row = { rank: 1, clan_id: "1", name: "Server-ranked Clan", tag: "API", crest: null, hq_level: 1, member_count: 0, capacity: 50, competitive_score: 100 };
  vi.mocked(loadRankings).mockResolvedValueOnce({ items: [row], own_standing: row, total_count: 1, offset: 0, limit: 30, next_offset: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useArenaRankings("clans"), { wrapper });
  await waitFor(() => expect(hook.result.current.data?.pages[0].items).toEqual([row])); // No client lifecycle/zero-member filter.
  vi.mocked(loadRankings).mockResolvedValue({ items: [], own_standing: null, total_count: 0, offset: 0, limit: 30, next_offset: null });
  await act(async () => { native.resume?.(); window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
  await waitFor(() => expect(hook.result.current.data?.pages[0]).toMatchObject({ items: [], own_standing: null, total_count: 0 }));
  expect(loadRankings).toHaveBeenCalledTimes(2); hook.unmount(); expect(native.resume).toBeNull();
});
