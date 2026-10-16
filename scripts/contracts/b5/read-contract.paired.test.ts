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
