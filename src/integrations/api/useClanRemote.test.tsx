import { governanceFixture } from "../../../e2e/post-b6-fixture";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { useClanRemote } from "./useClanRemote";
import { analytics } from "@/integrations/analytics/analytics";
import { ClanStatusSheet } from "@/features/clan/ClanStatusSheet";
import { ClanApiError } from "./b5";
import { OwnRequestOut } from "./b5Schemas";
import fixture from "./fixtures/b5/clan-http.json";
import lifecycle from "./fixtures/b5/lifecycle-http.json";
const api = vi.hoisted(() => Object.fromEntries(["create", "purchase", "activate", "leave", "activity", "state", "membership", "ownRequests", "discover", "preview", "home", "roster", "treasury", "equipment", "missions", "trophies", "governance", "recovery", "invite", "cancelRequest", "join", "applicants", "eligibleGroups"].map(key => [key, vi.fn()])));
const native = vi.hoisted(() => ({ resume: null as null | (() => void) }));
const feedback = vi.hoisted(() => vi.fn());
const scope = { session: 1, player: "9001", season: "s1", config: "v1" };
vi.mock("./BootstrapProvider", () => ({ useBootstrap: () => ({ scope, bootstrap: { data: { featureFlags: { clan: true }, serverTime: "2026-10-16T10:00:00Z" } } }) }));
vi.mock("./bootstrap", () => ({ isRemoteDataSource: () => true }));
vi.mock("@/integrations/telegram/TelegramProvider", () => ({ useTelegram: () => ({ adapter: { isTelegram: true, getInitData: () => "synthetic-auth", openTelegramLink: vi.fn(), subscribe: (_event: string, handler: () => void) => { native.resume = handler; return () => { native.resume = null; }; } } }) }));
vi.mock("./b5", async original => ({ ...(await original<typeof import("./b5")>()), clanApi: () => api }));
vi.mock("@/design-system/components/TransientFeedback", () => ({ showFeedback: feedback }));
const accepted = OwnRequestOut.parse({ ...lifecycle.pending_request[0], id: 1, clan_id: 1, clan_name: "Accepted Clan", state: "ACCEPTED", invite_state: "ACTIVE", credential_unresolved: true });
const cancelled = { ...accepted, id: 2, clan_id: 2, clan_name: "Historical Clan", state: "CANCELLED", invite_state: null, is_active: false, credential_unresolved: false, blocks_new_application: false, handling: "HISTORY" as const };
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
  api.activity.mockResolvedValue({ items: [], next_cursor: null, as_of: "2026-10-18T00:00:00Z" });
  api.applicants.mockResolvedValue([]); api.eligibleGroups.mockResolvedValue([]);
  localStorage.clear(); sessionStorage.clear();
});
afterEach(() => { client?.clear(); vi.restoreAllMocks(); });
it("captures successful Clan writes only and excludes failed/replayed economics", async () => {
  const track = vi.spyOn(analytics, "featureFor");
  member = fixture["membership/current"]; rows = [];
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  await act(async () => { await hook.result.current.run("join", async () => { throw new Error("denied"); }); });
  expect(track).not.toHaveBeenCalled();
  await act(async () => { await hook.result.current.run("create", async () => ({ id: 123 })); });
  await act(async () => { await hook.result.current.run("join", async () => ({ id: 123 })); });
  api.purchase.mockResolvedValue({ id: 9, replayed: false });
  await act(async () => { await hook.result.current.economic("purchase", "test-item"); });
  api.purchase.mockResolvedValue({ id: 9, replayed: true });
  await act(async () => { await hook.result.current.economic("purchase", "test-item"); });
  api.activate.mockResolvedValue({ id: 10, replayed: false });
  await act(async () => { await hook.result.current.economic("activate", "test-item"); });
  expect(track.mock.calls.map(call => call[2])).toEqual(["clan_registration_completed", "clan_join_request_submitted", "clan_shop_purchase_completed", "clan_shop_activation_completed"]);
});
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
  await waitFor(() => expect(screen.getByRole("dialog")).toHaveTextContent("Accepted · verify Telegram membership"));
  expect(screen.getByLabelText("Clan request history")).toHaveTextContent("Historical Clan"); expect(screen.getByLabelText("Clan request history")).toHaveTextContent("Cancelled");
  fireEvent.click(screen.getByRole("button", { name: "Check invite and access" })); await screen.findByRole("button", { name: "Open Telegram group" });
  expect(JSON.stringify(client.getQueryCache().getAll().map(query => query.state.data))).not.toContain("PRIVATE_TEST_CREDENTIAL"); expect(JSON.stringify(localStorage)).not.toContain("PRIVATE_TEST_CREDENTIAL");
  rows = [cancelled, accepted, { ...accepted, id: 3, clan_id: 3, clan_name: "Overlapping Clan", state: "PENDING" }];
  await act(async () => { await client.invalidateQueries(); });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Your Clan requests need review"));
  for (const name of ["Open Telegram group", "Check invite and access", "Cancel request"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  expect(api.invite).toHaveBeenCalledTimes(1);
});
it("holds cancellation-pending reservations until the server confirms terminalization, then uses actual verified membership", async () => {
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  api.cancelRequest.mockImplementationOnce(async () => { rows = [{ ...accepted, cancellation_pending: true, invite_state: "UNCERTAIN" }]; return { id: 1, state: "ACCEPTED" }; });
  await act(async () => { await hook.result.current.run("cancel", () => hook.result.current.api.cancelRequest(1)); });
  await waitFor(() => expect(hook.result.current.activeRequest?.cancellation_pending).toBe(true)); expect(hook.result.current.applicationsBlocked).toBe(true);
  rows = [cancelled]; await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.applicationsBlocked).toBe(false)); expect(hook.result.current.activeRequest).toBeNull();
  rows = [accepted]; await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.activeRequest?.state).toBe("ACCEPTED")); expect(hook.result.current.member).toBe(false);
  member = fixture["membership/current"]; rows = [{ ...cancelled, state: "ACTIVATED" }]; await act(async () => { await hook.result.current.refresh(); });
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
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Your Clan requests need review"));
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

it.each(["older", "terminal"])("keeps %s operator-required reservations read-only and blocks joins", async kind => {
  const operator = kind === "older" ? { ...accepted, is_current_season: false, season_id: 77, clan_season_id: 88, season_code: "older-season", handling: "OPERATOR_REQUIRED" as const }
    : { ...cancelled, credential_unresolved: true, blocks_new_application: true, handling: "OPERATOR_REQUIRED" as const };
  rows = [operator]; const { wrapper } = setup(); render(<Status />, { wrapper });
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("help from support"));
  for (const name of ["Open Telegram group", "Check invite and access", "Cancel request"]) expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
  if (kind === "older") expect(screen.getByRole("dialog")).toHaveTextContent("older-season");
  expect(api.invite).not.toHaveBeenCalled(); expect(api.cancelRequest).not.toHaveBeenCalled();
});
it("counts an unresolved terminal credential before selecting a current pending path", async () => {
  rows = [{ ...accepted, state: "PENDING" }, { ...cancelled, credential_unresolved: true, blocks_new_application: true, handling: "OPERATOR_REQUIRED" }];
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.applicationProblem).toBe("overlap"));
  expect(hook.result.current.activeRequest).toBeNull(); expect(hook.result.current.applicationsBlocked).toBe(true); expect(hook.result.current.blockingRequests).toHaveLength(2);
});

it("returns the committed mutation result when subsequent query refreshes fail", async () => {
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  api.ownRequests.mockRejectedValue(new Error("refresh unavailable"));
  const operation = vi.fn().mockResolvedValue({ id: 9, replayed: false });
  let result: unknown;
  await act(async () => { result = await hook.result.current.run("committed", operation); });
  expect(result).toEqual({ id: 9, replayed: false }); expect(operation).toHaveBeenCalledOnce();
  expect(feedback).toHaveBeenCalledWith(expect.stringContaining("Clan updated"), "info");
  expect(hook.result.current.pending).toBeNull(); expect(hook.result.current.applicationsBlocked).toBe(true);
});
it("preserves a successful write even if Query invalidation itself rejects", async () => {
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  vi.spyOn(client, "invalidateQueries").mockRejectedValue(new Error("query observer failed"));
  let result: unknown;
  await act(async () => { result = await hook.result.current.run("committed", async () => ({ id: 9 })); });
  expect(result).toEqual({ id: 9 }); expect(feedback).toHaveBeenCalledWith(expect.stringContaining("Clan updated"), "info");
});
it("retains confirmed membership through a background failure without enabling application actions", async () => {
  member = fixture["membership/current"];
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  api.membership.mockRejectedValue(new Error("membership refresh unavailable"));
  await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.membership.isError).toBe(true)); expect(hook.result.current.member).toBe(true);
  expect(hook.result.current.applicationsBlocked).toBe(true);
});
it("coalesces visibility and focus resume events and never issues a write", async () => {
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  const before = api.state.mock.calls.length;
  expect(native.resume).toBeTypeOf("function");
  await act(async () => { native.resume?.(); window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); });
  await waitFor(() => expect(api.state.mock.calls.length).toBe(before + 1));
  expect(api.join).not.toHaveBeenCalled(); expect(api.invite).not.toHaveBeenCalled();
  hook.unmount(); expect(native.resume).toBeNull();
  window.dispatchEvent(new Event("focus")); expect(api.state.mock.calls.length).toBe(before + 1);
});
it("holds the mutation lock through reconciliation and rejects duplicate writes", async () => {
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.activeRequest?.id).toBe(1));
  let finish!: (value: unknown) => void;
  const send = vi.fn(() => new Promise(done => { finish = done; }));
  let first!: Promise<unknown>;
  act(() => { first = hook.result.current.run("one", send); });
  await act(async () => { expect(await hook.result.current.run("two", send)).toBeUndefined(); });
  expect(send).toHaveBeenCalledOnce();
  await act(async () => { finish({ id: 1 }); await first; });
  expect(hook.result.current.pending).toBeNull();
});
it("polls fast membership/applicant changes and slower roster/HQ changes without writes", async () => {
  member = fixture["membership/current"]; api.state.mockResolvedValue(fixture.state);
  vi.useFakeTimers();
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  try {
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(hook.result.current.applicants.isSuccess).toBe(true);
    const counts = () => Object.fromEntries(["membership", "applicants", "home", "roster"].map(key => [key, api[key].mock.calls.length]));
    const initial = counts();
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(counts()).toEqual({ membership: initial.membership + 1, applicants: initial.applicants + 1, home: initial.home, roster: initial.roster });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(counts()).toEqual({ membership: initial.membership + 2, applicants: initial.applicants + 2, home: initial.home + 1, roster: initial.roster + 1 });
    expect(api.join).not.toHaveBeenCalled(); expect(api.invite).not.toHaveBeenCalled();
  } finally { hook.unmount(); vi.useRealTimers(); }
});
it.each([401, 403])("hides stale membership after definitive authorization denial %s", async status => {
  member = fixture["membership/current"];
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  api.membership.mockRejectedValue(new ClanApiError("CLAN_FORBIDDEN", status));
  await act(async () => { await hook.result.current.refresh(); });
  await waitFor(() => expect(hook.result.current.membershipDenied).toBe(true));
  expect(hook.result.current.member).toBe(false); expect(hook.result.current.applicationsBlocked).toBe(true);
});

it.each([null, "unauthorized"])("treats confirmed leave as final and removes old Clan content (%s)", async oldReads => {
  rows = []; member = { ...fixture["membership/current"], role: "SOLDIER" };
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.home.isSuccess).toBe(true));
  const oldCalls = api.home.mock.calls.length;
  api.leave.mockImplementationOnce(async () => {
    member = null; api.state.mockResolvedValue({ ...fixture.state, role: "SOLDIER", cooldown_until: "2026-10-18T10:00:00Z", voluntary_leave_count: 1 });
    for (const name of ["home", "roster", "treasury", "equipment", "missions", "trophies", "governance", "recovery"]) api[name].mockRejectedValue(new ClanApiError("CLAN_FORBIDDEN", oldReads ? 403 : 401));
    return null;
  });
  let outcome: unknown;
  await act(async () => { outcome = await hook.result.current.run("leave", () => hook.result.current.api.leave()); });
  expect(outcome).toBeNull(); expect(hook.result.current.member).toBe(false); expect(hook.result.current.membership.data).toBeNull();
  expect(hook.result.current.state.data?.cooldown_until).toBe("2026-10-18T10:00:00Z");
  expect(api.home.mock.calls.length).toBe(oldCalls);
  expect(feedback).toHaveBeenCalledWith("You left the Clan.", "success");
  expect(feedback).not.toHaveBeenCalledWith(expect.stringContaining("couldn't"), expect.anything());
  await act(async () => { native.resume?.(); });
  expect(hook.result.current.member).toBe(false); expect(api.home.mock.calls.length).toBe(oldCalls);
});
it("fences stale membership responses after leave without inventing a new role or cooldown", async () => {
  rows = []; member = { ...fixture["membership/current"], role: "SOLDIER" };
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true)); api.leave.mockResolvedValueOnce(null);
  await act(async () => { await hook.result.current.run("leave", () => hook.result.current.api.leave()); });
  expect(hook.result.current.member).toBe(false); expect(hook.result.current.membership.data).toBeNull();
  await act(async () => { await hook.result.current.refresh(); });
  expect(hook.result.current.member).toBe(false); expect(hook.result.current.membership.data).toBeNull();
});
it("reports actual mutation failure and preserves membership", async () => {
  rows = []; member = { ...fixture["membership/current"], role: "SOLDIER" };
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  api.leave.mockRejectedValueOnce(new ClanApiError("CLAN_FORBIDDEN", 403));
  await act(async () => { expect(await hook.result.current.run("leave", () => hook.result.current.api.leave())).toBeUndefined(); });
  expect(hook.result.current.member).toBe(true); expect(feedback).toHaveBeenCalledWith(expect.stringContaining("isn't available"));
  expect(feedback).not.toHaveBeenCalledWith("You left the Clan.", "success");
});
it("shows a refresh warning only when essential new status fails after the leave committed", async () => {
  rows = []; member = { ...fixture["membership/current"], role: "SOLDIER" };
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  api.leave.mockImplementationOnce(async () => { member = null; api.state.mockRejectedValue(new Error("state unavailable")); return null; });
  await act(async () => { expect(await hook.result.current.run("leave", () => hook.result.current.api.leave())).toBeNull(); });
  expect(hook.result.current.member).toBe(false);
  expect(feedback).toHaveBeenCalledWith("You left the Clan. Current status couldn't refresh. Retry from Clan status.", "info");
});
it.each([401, 403])("accepts obsolete membership denial %s after a confirmed departure", async status => {
  rows = []; member = { ...fixture["membership/current"], role: "SOLDIER" };
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  api.leave.mockImplementationOnce(async () => {
    api.membership.mockRejectedValue(new ClanApiError("CLAN_FORBIDDEN", status));
    api.state.mockResolvedValue({ ...fixture.state, role: "SOLDIER", cooldown_until: "2026-10-18T10:00:00Z" });
    return null;
  });
  await act(async () => { await hook.result.current.run("leave", () => hook.result.current.api.leave()); });
  expect(hook.result.current.membership.isError).toBe(false); expect(hook.result.current.member).toBe(false);
  expect(feedback).toHaveBeenCalledWith("You left the Clan.", "success");
});
it("defaults dissolution to cancellation and requires acknowledgement of the Season restriction", async () => {
  rows = []; member = fixture["membership/current"]; api.state.mockResolvedValue(fixture.state);
  api.recovery.mockResolvedValue({ ...fixture.recovery, governance: governanceFixture() });
  const { wrapper } = setup(); render(<Status />, { wrapper });
  const start = await screen.findByRole("button", { name: "Request dissolution" });
  await waitFor(() => expect(start).toBeEnabled()); fireEvent.click(start);
  expect(screen.getByRole("dialog")).toHaveTextContent("You cannot create another Clan in the same Season");
  expect(screen.getByRole("button", { name: "Dissolve now" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "I understand the current-Season recreation restriction." }));
  expect(screen.getByRole("button", { name: "Dissolve now" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Request dissolution" }));
  expect(screen.getByRole("button", { name: "Dissolve now" })).toBeDisabled();
});
it.each(["IMMEDIATE", "VOTE_REQUIRED", "BLOCKED"] as const)("uses authoritative %s dissolution readiness rather than roster size", async outcome => {
  rows = []; member = fixture["membership/current"]; api.state.mockResolvedValue(fixture.state);
  api.recovery.mockResolvedValue({ ...fixture.recovery, governance: governanceFixture(outcome) });
  const { wrapper } = setup(); render(<Status />, { wrapper });
  const start = await screen.findByRole("button", { name: "Request dissolution" });
  if (outcome === "BLOCKED") {
    await waitFor(() => expect(screen.getByLabelText("Governance prerequisites")).toHaveTextContent("not enough eligible voters"));
    expect(start).toBeDisabled(); expect(screen.getByLabelText("Governance prerequisites")).toHaveTextContent("3"); return;
  }
  await waitFor(() => expect(start).toBeEnabled()); fireEvent.click(start);
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
  const confirm = screen.getByRole("button", { name: outcome === "IMMEDIATE" ? "Dissolve now" : "Open dissolution vote" });
  expect(confirm).toBeDisabled();
  expect(screen.getByRole("dialog")).toHaveTextContent(outcome === "IMMEDIATE" ? "There is no vote" : "opens a governance vote");
});
it("revalidates changed readiness at submit and never posts an immediate dissolution based on an older confirmation", async () => {
  rows = []; member = fixture["membership/current"]; api.state.mockResolvedValue(fixture.state);
  api.recovery.mockResolvedValue({ ...fixture.recovery, governance: governanceFixture("IMMEDIATE") });
  const { wrapper } = setup(); render(<Status />, { wrapper });
  const start = await screen.findByRole("button", { name: "Request dissolution" }); await waitFor(() => expect(start).toBeEnabled()); fireEvent.click(start);
  const checkbox = screen.getByRole("checkbox"); await waitFor(() => expect(checkbox).toBeEnabled()); fireEvent.click(checkbox);
  api.recovery.mockResolvedValue({ ...fixture.recovery, governance: governanceFixture("VOTE_REQUIRED") });
  fireEvent.click(screen.getByRole("button", { name: "Dissolve now" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Open dissolution vote" })).toBeDisabled());
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(feedback).toHaveBeenCalledWith(expect.stringContaining("Clan status changed"), "info");
});
it.each(["leave", "create"])("discards the complete stale Clan ranking cache after confirmed %s without filtering rows", async action => {
  rows = []; member = { ...fixture["membership/current"], role: "SOLDIER" };
  const { wrapper } = setup(); const hook = renderHook(() => useClanRemote(), { wrapper });
  await waitFor(() => expect(hook.result.current.member).toBe(true));
  const key = ["player", scope.session, scope.player, scope.season, scope.config, "arena", "rankings", "clans"];
  client.setQueryData(key, { pages: [{ items: [{ clan_id: 1, rank: 1 }], own_standing: { rank: 1 }, total_count: 1 }] });
  await act(async () => { await hook.result.current.run(action, async () => { if (action === "leave") member = null; return action === "leave" ? null : { id: 2 }; }); });
  expect(client.getQueryData(key)).toBeUndefined();
});
