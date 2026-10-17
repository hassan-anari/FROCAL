import { expect, it } from "vitest";
import { selectClanApplications } from "./clanApplications";
import { OwnRequestOut } from "./b5Schemas";
import lifecycle from "./fixtures/b5/lifecycle-http.json";
const row = (id: number, state: string, clan = id) => {
  const active = state === "PENDING" || state === "ACCEPTED";
  return OwnRequestOut.parse({ ...lifecycle.pending_request[0], id, clan_id: clan, state, is_active: active, blocks_new_application: active, credential_unresolved: false, handling: active ? "CURRENT_SEASON" : "HISTORY" });
};
it.each(["PENDING", "ACCEPTED"])("finds the single %s application behind newer terminal history in either list order", state => {
  const active = row(1, state);
  const terminal = [row(4, "CANCELLED"), row(3, "DECLINED"), row(2, "ACTIVATED")];
  for (const rows of [[...terminal, active], [active, ...terminal]]) {
    const selection = selectClanApplications(rows);
    expect(selection.activeRequest).toBe(active); expect(selection.history).toEqual(terminal); expect(selection.ambiguous).toBe(false);
  }
});
it.each(["DECLINED", "CANCELLED", "ACTIVATED", "WITHDRAWN", "EXPIRED"])("keeps %s read-only without creating an active application", state => {
  const terminal = row(10, state);
  expect(selectClanApplications([terminal])).toMatchObject({ activeRequest: null, history: [terminal], ambiguous: false });
});
it.each([["PENDING", "PENDING"], ["ACCEPTED", "PENDING"], ["ACCEPTED", "ACCEPTED"]])("never chooses a Clan from overlapping %s/%s applications", (first, second) => {
  for (const rows of [[row(1, first), row(2, second)], [row(2, second), row(1, first)]]) expect(selectClanApplications(rows)).toMatchObject({ activeRequest: null, history: [], ambiguous: true });
});
it("keeps cancellation-pending accepted reservations active until a confirmed terminal response", () => {
  const pending = OwnRequestOut.parse(lifecycle.unsafe_cancellation_retained[0]);
  expect(selectClanApplications([row(99, "CANCELLED"), pending]).activeRequest).toBe(pending);
  expect(selectClanApplications([{ ...pending, state: "CANCELLED", is_active: false, credential_unresolved: false, blocks_new_application: false, handling: "HISTORY" }]).activeRequest).toBeNull();
  expect(selectClanApplications([])).toMatchObject({ activeRequest: null, history: [], ambiguous: false });
});

it.each(["CANCELLED", "ACTIVATED", "DECLINED"])("uses authoritative unresolved-credential metadata for terminal-labelled %s requests", state => {
  const unsafe = OwnRequestOut.parse({ ...row(1, state), credential_unresolved: true, blocks_new_application: true, handling: "OPERATOR_REQUIRED" });
  const single = selectClanApplications([row(5, "DECLINED"), unsafe]);
  expect(single).toMatchObject({ activeRequest: null, operatorRequest: unsafe, operatorRequired: true, blocksNewApplication: true, ambiguous: false });
  expect(single.history).toHaveLength(1);
  const overlap = selectClanApplications([row(3, "PENDING"), unsafe]);
  expect(overlap).toMatchObject({ activeRequest: null, operatorRequest: null, ambiguous: true, blocksNewApplication: true });
});
it.each(["PENDING", "ACCEPTED"])("preserves original Season identity without offering an old %s invitation", state => {
  const old = OwnRequestOut.parse({ ...row(7, state), season_id: 77, clan_season_id: 88, season_code: "older", is_current_season: false, handling: "OPERATOR_REQUIRED" });
  expect(selectClanApplications([old])).toMatchObject({ activeRequest: null, operatorRequest: old, operatorRequired: true, blocksNewApplication: true });
});
it("fails closed for contradictory current handling rather than granting an action", () => {
  const inconsistent = OwnRequestOut.parse({ ...row(1, "PENDING"), blocks_new_application: false });
  expect(selectClanApplications([inconsistent])).toMatchObject({ activeRequest: null, operatorRequired: true, blocksNewApplication: true });
});
