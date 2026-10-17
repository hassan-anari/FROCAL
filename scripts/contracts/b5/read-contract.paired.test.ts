import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import * as c from "../../../src/integrations/api/b5Schemas";
const actual = JSON.parse(readFileSync(process.env.B5_LIVE_FIXTURE!, "utf8"));
it("validates fresh real PostgreSQL HTTP reads against frontend B5 schemas", () => {
  const schemas: Record<string, { parse: (value: unknown) => unknown }> = { state: c.StateOut, home: c.ClanHomeOut, roster: c.RosterPage, treasury: c.TreasuryOut, equipment: c.EquipmentOut, equipment_after_activation: c.EquipmentOut, recovery: c.RecoveryOut, "membership/current": c.MembershipOut, purchase: c.MutationOut, purchase_replay: c.MutationOut };
  for (const [key, schema] of Object.entries(schemas)) expect(schema.parse(actual[key])).toEqual(actual[key]);
  for (const trophy of actual.trophies) c.TrophyOut.parse(trophy);
});
it("retains backend replay, permission, quantity/effect and member identity evidence", () => {
  expect(actual.purchase_replay).toMatchObject({ id: actual.purchase.id, replayed: true });
  expect(actual.forbidden.code).toBe("CLAN_FORBIDDEN");
  expect(actual.roster.items.every((row: any) => row.membership_id > 0 && !Object.hasOwn(row, "telegram_user_id"))).toBe(true);
  expect(actual.equipment_after_activation.active_effects.length).toBeGreaterThan(0);
  for (const effect of actual.equipment_after_activation.active_effects) expect(Date.parse(effect.expires_at)).toBeGreaterThan(Date.parse(effect.starts_at));
  const purchased = actual.equipment_after_activation.items.find((item: any) => item.item_id === "rally-beacon");
  expect(purchased.quantity).toBe(0); expect(purchased.uses_this_season).toBe(1);
  expect(actual.trophies.find((row: any) => row.key === "banner-raised")).toMatchObject({ available: false, current: null, target: null, unlocked: false });
});
it("validates fresh authority loss/recovery and governance/access/unsafe-credential lifecycle evidence", () => {
  const authority = JSON.parse(readFileSync(process.env.B5_AUTHORITY_FIXTURE!, "utf8"));
  const lifecycle = JSON.parse(readFileSync(process.env.B5_LIFECYCLE_FIXTURE!, "utf8"));
  for (const value of Object.values(authority)) c.RecoveryOut.parse(value);
  expect(authority.authority_lost).toMatchObject({ reasons: ["CAPTAIN_AUTHORITY_LOSS"], home_integrity_available: false });
  expect(authority.authority_restored).toMatchObject({ reasons: [], home_integrity_available: true });
  for (const key of ["governance_open", "governance_final"]) c.GovernanceOut.parse(lifecycle[key]);
  for (const key of ["access_lost", "access_recovered"]) c.MembershipOut.parse(lifecycle[key]);
  c.InviteOut.parse(lifecycle.uncertain_invite);
  for (const key of ["pending_request", "unsafe_cancellation_retained"]) for (const row of lifecycle[key]) c.OwnRequestOut.parse(row);
  expect(lifecycle.unsafe_cancellation_retained[0]).toMatchObject({ state: "ACCEPTED", invite_state: "UNCERTAIN", cancellation_pending: true });
});
it("consumes fresh authoritative global visibility and bounded-history metadata", async () => {
  const { selectClanApplications } = await import("../../../src/integrations/api/clanApplications");
  const history = JSON.parse(readFileSync(process.env.B5_HISTORY_FIXTURE!, "utf8"));
  const visibility = JSON.parse(readFileSync(process.env.B5_VISIBILITY_FIXTURE!, "utf8"));
  const application = JSON.parse(readFileSync(process.env.B5_APPLICATION_FIXTURE!, "utf8"));
  c.RequestOut.parse(application.first_request); expect(application.second_clan_conflict.code).toBe("CLAN_STATE_CONFLICT");
  const rows = history.default_response.map((row: unknown) => c.OwnRequestOut.parse(row));
  expect(history.newer_terminal_count).toBe(26);
  expect(selectClanApplications(rows).activeRequest).toMatchObject({ state: "ACCEPTED", cancellation_pending: true, blocks_new_application: true });
  const overlap = visibility.all_active_despite_history_offset.map((row: unknown) => c.OwnRequestOut.parse(row));
  expect(selectClanApplications(overlap)).toMatchObject({ ambiguous: true, activeRequest: null, blocksNewApplication: true });
  const old = overlap.find((row: c.OwnRequestOut) => !row.is_current_season)!;
  expect(selectClanApplications([old])).toMatchObject({ operatorRequired: true, activeRequest: null });
  expect(visibility.ambiguous_invite.code).toBe("CLAN_STATE_CONFLICT");
});
