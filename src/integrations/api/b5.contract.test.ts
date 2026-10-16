import { expect, it, vi } from "vitest";
import fixture from "./fixtures/b5/clan-http.json";
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
