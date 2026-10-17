import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useClanRemote } from "./useClanRemote";
import { ClanStatusSheet } from "@/features/clan/ClanStatusSheet";
import { ClanApiError } from "./b5";
import { OwnRequestOut } from "./b5Schemas";
import fixture from "./fixtures/b5/clan-http.json";
import lifecycle from "./fixtures/b5/lifecycle-http.json";
const api = vi.hoisted(() => Object.fromEntries(["state", "membership", "ownRequests", "discover", "preview", "home", "roster", "treasury", "equipment", "missions", "trophies", "governance", "recovery", "invite", "cancelRequest", "join"].map(key => [key, vi.fn()])));
const feedback = vi.hoisted(() => vi.fn());
const scope = { session: 1, player: "9001", season: "s1", config: "v1" };
vi.mock("./BootstrapProvider", () => ({ useBootstrap: () => ({ scope, bootstrap: { data: { featureFlags: { clan: true }, serverTime: "2026-10-16T10:00:00Z" } } }) }));
vi.mock("./bootstrap", () => ({ isRemoteDataSource: () => true }));
vi.mock("@/integrations/telegram/TelegramProvider", () => ({ useTelegram: () => ({ adapter: { isTelegram: true, getInitData: () => "synthetic-auth", openTelegramLink: vi.fn() } }) }));
vi.mock("./b5", async original => ({ ...(await original<typeof import("./b5")>()), clanApi: () => api }));
vi.mock("@/design-system/components/TransientFeedback", () => ({ showFeedback: feedback }));
const accepted = OwnRequestOut.parse({ ...lifecycle.pending_request[0], id: 1, clan_id: 1, clan_name: "Accepted Clan", state: "ACCEPTED", invite_state: "ACTIVE" });
const cancelled = { ...accepted, id: 2, clan_id: 2, clan_name: "Historical Clan", state: "CANCELLED", invite_state: null };
let rows = [cancelled, accepted];
let member: any = null;
let client: QueryClient;
function setup() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { wrapper };
}
beforeEach(() => {
  vi.clearAllMocks(); rows = [cancelled, accepted]; member = null;
  api.state.mockResolvedValue({ ...fixture.state, role: "SOLDIER" }); api.membership.mockImplementation(async () => member);
  api.ownRequests.mockImplementation(async () => rows); api.discover.mockResolvedValue([]); api.preview.mockResolvedValue({ id: 1 });
  for (const name of ["home", "roster", "treasury", "equipment", "missions", "trophies", "governance", "recovery"]) api[name].mockResolvedValue((fixture as any)[name]);
  api.invite.mockResolvedValue({ state: "ACTIVE", invite_link: "https://t.me/+PRIVATE_TEST_CREDENTIAL", delivery_state: "PENDING" });
  localStorage.clear(); sessionStorage.clear();
});
afterEach(() => client?.clear());
it("blocks joins until the authenticated request read succeeds and selects the older accepted record rather than newer history", async () => {
  let finish!: (value: typeof rows) => void;
  api.ownRequests.mockImplementationOnce(() => new Promise(done => { finish = done; }));
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(api.ownRequests).toHaveBeenCalled()); expect(hook.result.current.applicationsBlocked).toBe(true);
  await act(async () => finish(rows));
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  expect(hook.result.current.requestHistory).toEqual([cancelled]); expect(hook.result.current.applicationsBlocked).toBe(true);
  expect(api.preview).toHaveBeenCalledWith(1, expect.any(AbortSignal));
});
it("keeps accepted invite access in the existing modal, then hides credentials and all application actions on a legacy overlap", async () => {
  const { wrapper } = setup(); render(<Status />, { wrapper });
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("ACCEPTED"));
  expect(screen.getByLabelText("Clan request history")).toHaveTextContent("Historical Clan"); expect(screen.getByLabelText("Clan request history")).toHaveTextContent("CANCELLED");
  fireEvent.click(screen.getByRole("button", { name: "Check invite and access" })); await screen.findByRole("button", { name: "Open Telegram group" });
  expect(JSON.stringify(client.getQueryCache().getAll().map(query => query.state.data))).not.toContain("PRIVATE_TEST_CREDENTIAL"); expect(JSON.stringify(localStorage)).not.toContain("PRIVATE_TEST_CREDENTIAL");
  rows = [cancelled, accepted, { ...accepted, id: 3, clan_id: 3, clan_name: "Overlapping Clan", state: "PENDING" }];
  await act(async () => { await client.invalidateQueries(); });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("More than one active Clan request"));
  for (const name of ["Open Telegram group", "Check invite and access", "Cancel request"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  expect(api.invite).toHaveBeenCalledTimes(1);
});
it("holds cancellation-pending reservations until the server confirms terminalization, then uses actual verified membership", async () => {
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  api.cancelRequest.mockImplementationOnce(async () => { rows = [{ ...accepted, cancellation_pending: true, invite_state: "UNCERTAIN" }]; return { id: 1, state: "ACCEPTED" }; });
  await act(async () => { await hook.result.current.run("cancel", () => hook.result.current.api.cancelRequest(1)); });
  await waitFor(() => expect(hook.result.current.activeRequest?.cancellation_pending).toBe(true)); expect(hook.result.current.applicationsBlocked).toBe(true);
  rows = [{ ...accepted, state: "CANCELLED" }]; await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.applicationsBlocked).toBe(false)); expect(hook.result.current.activeRequest).toBeNull();
  rows = [accepted]; await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.activeRequest?.state).toBe("ACCEPTED")); expect(hook.result.current.member).toBe(false);
  member = fixture["membership/current"]; rows = [{ ...accepted, state: "ACTIVATED" }]; await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.member).toBe(true)); expect(hook.result.current.activeRequest).toBeNull(); expect(hook.result.current.requestHistory[0].state).toBe("ACTIVATED");
});
it("uses the existing feedback and authoritative refresh after a server conflict without creating local state", async () => {
  rows = []; const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.applicationProblem).toBeNull());
  api.join.mockImplementationOnce(async () => { rows = [accepted]; throw new ClanApiError("CLAN_STATE_CONFLICT", 409); });
  await act(async () => { await hook.result.current.run("join", () => hook.result.current.api.join(2)); });
  await waitFor(() => expect(hook.result.current.activeRequest?.clan_id).toBe(1)); expect(feedback).toHaveBeenCalledOnce(); expect(hook.result.current.member).toBe(false); expect(hook.result.current.applicationsBlocked).toBe(true);
});
it("hides a late credential response after the application becomes ambiguous", async () => {
  let finish!: (value: unknown) => void; api.invite.mockImplementationOnce(() => new Promise(done => { finish = done; }));
  const { wrapper } = setup(); render(<Status />, { wrapper });
  await screen.findByRole("button", { name: "Check invite and access" }); fireEvent.click(screen.getByRole("button", { name: "Check invite and access" })); await waitFor(() => expect(api.invite).toHaveBeenCalledOnce());
  rows = [accepted, { ...accepted, id: 3, clan_id: 3, state: "PENDING" }]; await act(async () => { await client.invalidateQueries(); });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("More than one active Clan request"));
  await act(async () => { finish({ state: "ACTIVE", invite_link: "https://t.me/+STALE_PRIVATE_CREDENTIAL", delivery_state: "PENDING" }); });
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled());
  expect(screen.queryByRole("button", { name: "Open Telegram group" })).not.toBeInTheDocument(); expect(screen.getByRole("dialog")).not.toHaveTextContent("STALE_PRIVATE_CREDENTIAL");
  expect(JSON.stringify(client.getQueryCache().getAll().map(query => query.state.data))).not.toContain("STALE_PRIVATE_CREDENTIAL");
});
it("blocks joins and credential access when the authoritative request refresh fails", async () => {
  const { wrapper } = setup(); render(<Status />, { wrapper }); await screen.findByRole("button", { name: "Check invite and access" });
  fireEvent.click(screen.getByRole("button", { name: "Check invite and access" })); await screen.findByRole("button", { name: "Open Telegram group" });
  api.ownRequests.mockRejectedValue(new Error("Isolated read failure")); await act(async () => { await client.invalidateQueries(); });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Clan requests couldn't load"));
  expect(screen.queryByRole("button", { name: "Open Telegram group" })).not.toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument(); expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled();
});
function Status() { const live = useClanRemote(); return <ClanStatusSheet live={live} onClose={() => {}} />; }
