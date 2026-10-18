import { expect, it, vi } from "vitest";
import { clanEconomicIntent } from "./clanIntent";
import { ClanApiError } from "./b5";
import { clanItem, clanMember, clanTrophy } from "./clanViews";
import { RosterMemberOut } from "./b5Schemas";
import fixture from "./fixtures/b5/clan-http.json";
const scope = { player: "verified", season: "one", membership: 3 };
it("retains uncertain purchase intent across reloads, separates membership/action, and clears confirmed outcomes", async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  let first = "";
  await expect(clanEconomicIntent(storage, scope, "purchase", "rally-beacon", async key => { first = key; throw new Error("lost response after commit"); })).rejects.toThrow();
  expect(values.size).toBe(1);
  await clanEconomicIntent(storage, { ...scope, membership: 4 }, "purchase", "rally-beacon", async key => { expect(key).not.toBe(first); return fixture.purchase; });
  await clanEconomicIntent(storage, scope, "activate", "rally-beacon", async key => { expect(key).not.toBe(first); return fixture.purchase; });
  const replay = await clanEconomicIntent(storage, scope, "purchase", "rally-beacon", async key => { expect(key).toBe(first); return fixture.purchase_replay; });
  expect(replay.replayed).toBe(true); expect(values.size).toBe(0);
  await expect(clanEconomicIntent(storage, scope, "purchase", "rally-beacon", async () => { throw new ClanApiError("CLAN_FORBIDDEN", 403); })).rejects.toBeInstanceOf(ClanApiError);
  expect(values.size).toBe(0);
});
it("never sends economic mutations without durable intent storage", async () => {
  const send = vi.fn();
  await expect(clanEconomicIntent({ getItem: () => null, setItem: () => { throw new Error("storage denied"); }, removeItem: () => {} }, scope, "purchase", "rally-beacon", send)).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
it("maps actual catalog prices/effects and roster contribution, keeping unresolved trophy progress absent", () => {
  for (const item of fixture.equipment.items) {
    expect(clanItem(item)).toMatchObject({ id: item.item_id, name: item.name, price: item.price });
  }
  expect(clanItem(fixture.equipment.items.find(item => item.item_id === "rally-beacon")!)?.effect).toBe("+20% HQ XP generation");
  expect(clanItem(fixture.equipment.items.find(item => item.item_id === "command-relay")!)?.effect).toBe("+2,000 HQ XP");
  for (const row of fixture.roster.items) expect(clanMember(RosterMemberOut.parse(row))).toMatchObject({ id: String(row.membership_id), level: row.level, contribution: row.contribution });
  expect(clanTrophy(fixture.trophies[0])).toMatchObject({ available: false, current: null, target: null, unlocked: false });
});

it("does not turn an unsupported requirement key into editorial mission instructions", async () => {
  const { clanMission } = await import("./clanViews");
  const row = { key: "private-admin-mission-key", version: 1, kind: "GROUP", target_units: 5, reward_band: "SMALL", starts_at: "2026-10-16T00:00:00Z", ends_at: "2026-10-17T00:00:00Z", progress_units: 0, completed: false, requirement: "UNSUPPORTED_INTERNAL_KEY", availability: "UNAVAILABLE" as const, blocked_reason: "UNSUPPORTED_REQUIREMENT", participant_gross_points: null, direct_hq_xp: null, reward_state: "UNAVAILABLE", own_player_reward: null };
  const view = clanMission(row);
  expect(view.title).toBe("Clan mission"); expect(view.description).toBe("This mission is unavailable.");
  expect(JSON.stringify(view)).not.toContain("UNSUPPORTED INTERNAL KEY"); expect(view.rewardLabel).toBe("Unavailable");
});

it("uses real distinct timed equipment names and counts effect rows separately", async () => {
  const { clanEquipmentMetrics } = await import("./clanViews");
  const now = Date.parse(fixture.equipment.server_time);
  const timed = fixture.equipment.items.filter(item => item.activation === "TIMED");
  const effect = (item_id: string, id: number) => ({ id, item_id, category: "HQ_XP_RATE_BONUS_BPS", value: 2000, starts_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 1000).toISOString(), effective: true });
  const equipment = { ...fixture.equipment, active_effects: [effect(timed[0].item_id, 1), effect(timed[0].item_id, 2)] };
  expect(clanEquipmentMetrics(equipment, now)).toEqual({ facilities: timed[0].name, effects: 2 });
  equipment.active_effects.push(effect(timed[1].item_id, 3));
  expect(clanEquipmentMetrics(equipment, now)).toEqual({ facilities: `${timed[0].name} +1`, effects: 3 });
  expect(clanEquipmentMetrics(equipment, now + 1000)).toEqual({ facilities: `${equipment.items.reduce((n, item) => n + item.quantity, 0)} items`, effects: 0 });
});
it("excludes expired, future, ineffective and consumed context effects and unowned shop products", async () => {
  const { clanEquipmentMetrics } = await import("./clanViews");
  const now = Date.parse(fixture.equipment.server_time);
  const items = fixture.equipment.items.map(item => ({ ...item, quantity: 0 }));
  const timed = items.find(item => item.activation === "TIMED")!;
  const context = items.find(item => item.activation === "CONTEXT")!;
  const base = { id: 1, item_id: timed.item_id, category: "HQ_XP_RATE_BONUS_BPS", value: 1, starts_at: new Date(now - 1000).toISOString(), expires_at: new Date(now + 1000).toISOString(), effective: true };
  const active_effects = [{ ...base, effective: false }, { ...base, expires_at: new Date(now).toISOString() }, { ...base, starts_at: new Date(now + 500).toISOString() }, { ...base, item_id: context.item_id }];
  expect(clanEquipmentMetrics({ ...fixture.equipment, items, active_effects }, now)).toEqual({ facilities: "0 items", effects: 0 });
  items[0].quantity = 3;
  expect(clanEquipmentMetrics({ ...fixture.equipment, items, active_effects }, now).facilities).toBe("3 items");
});
