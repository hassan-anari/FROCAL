import { expect, it, vi } from "vitest";
import fixture from "./fixtures/b5/clan-http.json";
import authority from "./fixtures/b5/authority-http.json";
import lifecycle from "./fixtures/b5/lifecycle-http.json";
import history from "./fixtures/b5/request-history-isolation-http.json";
import visibility from "./fixtures/b5/request-visibility-http.json";
import application from "./fixtures/b5/single-application-http.json";
import { selectClanApplications } from "./clanApplications";
import openapi from "./fixtures/b5/openapi.json";
import * as c from "./b5Schemas";
import { clanApi, ClanApiError } from "./b5";
vi.mock("./client", async original => ({ ...(await original<typeof import("./client")>()), apiRequest: vi.fn() }));
import { apiRequest } from "./client";
const reads = [
  [c.StateOut, fixture.state], [c.ClanHomeOut, fixture.home], [c.RosterPage, fixture.roster],
  [c.TreasuryOut, fixture.treasury], [c.EquipmentOut, fixture.equipment],
  [c.EquipmentOut, fixture.equipment_after_activation], [c.MembershipOut, fixture["membership/current"]],
  [c.RecoveryOut, fixture.recovery], [c.MutationOut, fixture.purchase], [c.MutationOut, fixture.purchase_replay],
] as const;
it("parses actual pinned PostgreSQL-generated B5 reads without frontend economy defaults", () => {
  for (const [schema, value] of reads) expect(schema.parse(value)).toEqual(value);
  for (const row of fixture.trophies) expect(c.TrophyOut.parse(row)).toEqual(row);
  expect(fixture.trophies[0]).toMatchObject({ available: false, current: null, target: null, unlocked: false });
  expect(fixture.equipment.items.every(item => !["DEFENCE", "ALLIANCE"].includes(item.activation ?? ""))).toBe(true);
});
it("uses existing authenticated no-store reads and caller-owned replay keys exactly", async () => {
  const api = clanApi("synthetic-auth");
  vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify(fixture.equipment)));
  expect(await api.equipment()).toEqual(fixture.equipment);
  expect(apiRequest).toHaveBeenLastCalledWith("/clans/equipment", expect.objectContaining({ initData: "synthetic-auth", cache: "no-store", method: "GET" }));
  for (const result of [fixture.purchase, fixture.purchase_replay]) {
    vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify(result)));
    expect(await api.purchase("rally-beacon", "same-intent-key")).toEqual(result);
    expect(apiRequest).toHaveBeenLastCalledWith("/clans/shop/rally-beacon/purchase", expect.objectContaining({ method: "POST", body: JSON.stringify({ idempotency_key: "same-intent-key" }) }));
  }
});
it("keeps server authorization/conflict errors categorical and never exposes exception detail", async () => {
  vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify({ ...fixture.forbidden, detail: "PRIVATE_EXCEPTION_CREDENTIAL" }), { status: 403 }));
  const error = await clanApi("synthetic-auth").equipment().catch(value => value);
  expect(error).toBeInstanceOf(ClanApiError);
  expect(error.code).toBe("CLAN_FORBIDDEN");
  expect(error.message).not.toContain("PRIVATE");
});
it("uses documented route names and two published roles; rejects client Telegram chat IDs in creation", () => {
  const paths = openapi.paths as Record<string, any>;
  for (const path of ["state", "home", "eligible-groups", "equipment", "roster", "treasury", "missions", "trophies", "governance", "recovery", "membership/current", "join-requests/current", "invite/current", "applicants"]) expect(paths[`/api/v1/clans/${path}`]?.get).toBeTruthy();
  expect(c.RoleIn.safeParse({ role: "OFFICER" }).success).toBe(false);
  expect(c.ClanCreateIn.safeParse({ telegram_group_id: -100123, name: "Clan", tag: "CC" }).success).toBe(false);
  expect(c.ClanCreateIn.parse({ telegram_group_id: 12, name: "Clan", tag: "CC" })).toEqual({ telegram_group_id: 12, name: "Clan", tag: "CC" });
});

it("parses the published authority and lifecycle handoff without clearing independent recovery or unsafe credentials", () => {
  for (const value of Object.values(authority)) c.RecoveryOut.parse(value);
  expect(authority.authority_lost.reasons).toContain("CAPTAIN_AUTHORITY_LOSS");
  expect(authority.authority_restored.reasons).toEqual([]);
  c.GovernanceOut.parse(lifecycle.governance_open); c.GovernanceOut.parse(lifecycle.governance_final);
  c.MembershipOut.parse(lifecycle.access_lost); c.MembershipOut.parse(lifecycle.access_recovered);
  c.InviteOut.parse(lifecycle.uncertain_invite);
  for (const row of lifecycle.unsafe_cancellation_retained) c.OwnRequestOut.parse(row);
  expect((openapi.paths as Record<string, any>)["/api/v1/clans/recovery/verify"].post).toBeTruthy();
});

it("preserves actual metadata, global blocking paths and deferred Season 2 from the corrected pin", () => {
  const rows = history.default_response.map(row => c.OwnRequestOut.parse(row));
  expect(history.newer_terminal_count).toBe(26); expect(selectClanApplications(rows).activeRequest?.state).toBe("ACCEPTED");
  const overlap = visibility.all_active_despite_history_offset.map(row => c.OwnRequestOut.parse(row));
  expect(selectClanApplications(overlap)).toMatchObject({ ambiguous: true, activeRequest: null });
  expect(selectClanApplications(overlap.filter(row => !row.is_current_season))).toMatchObject({ operatorRequired: true, activeRequest: null });
  expect(fixture.state.owner_decisions_pending).toEqual([]);
  expect(fixture.trophies.find(row => row.key === "banner-raised")).toMatchObject({ available: false, blocked_reason: "SEASON_2_DEFERRED", current: null, target: null, unlocked: false });
});
it("uses the actual single-application conflict envelope without exposing backend detail", async () => {
  c.RequestOut.parse(application.first_request);
  vi.mocked(apiRequest).mockResolvedValueOnce(new Response(JSON.stringify(application.second_clan_conflict), { status: 409 }));
  await expect(clanApi("synthetic-auth").join(2)).rejects.toMatchObject({ code: "CLAN_STATE_CONFLICT", status: 409, retryable: false });
});

it.each([204, 200])("accepts confirmed Soldier leave success with %s/null", async status => {
  vi.mocked(apiRequest).mockResolvedValueOnce(new Response(status === 204 ? null : "null", { status }));
  await expect(clanApi("synthetic-auth").leave()).resolves.toBeNull();
});
