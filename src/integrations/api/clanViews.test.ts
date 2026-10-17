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
