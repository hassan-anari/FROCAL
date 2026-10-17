import { expect, it } from "vitest";
import { selectClanApplications } from "./clanApplications";
import { OwnRequestOut } from "./b5Schemas";
import lifecycle from "./fixtures/b5/lifecycle-http.json";
const row = (id: number, state: string, clan = id) => OwnRequestOut.parse({ ...lifecycle.pending_request[0], id, clan_id: clan, state });
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
  expect(selectClanApplications([terminal])).toEqual({ activeRequest: null, history: [terminal], ambiguous: false });
});
it.each([["PENDING", "PENDING"], ["ACCEPTED", "PENDING"], ["ACCEPTED", "ACCEPTED"]])("never chooses a Clan from overlapping %s/%s applications", (first, second) => {
  for (const rows of [[row(1, first), row(2, second)], [row(2, second), row(1, first)]]) expect(selectClanApplications(rows)).toEqual({ activeRequest: null, history: [], ambiguous: true });
});
it("keeps cancellation-pending accepted reservations active until a confirmed terminal response", () => {
  const pending = OwnRequestOut.parse(lifecycle.unsafe_cancellation_retained[0]);
  expect(selectClanApplications([row(99, "CANCELLED"), pending]).activeRequest).toBe(pending);
  expect(selectClanApplications([{ ...pending, state: "CANCELLED" }]).activeRequest).toBeNull();
  expect(selectClanApplications([])).toEqual({ activeRequest: null, history: [], ambiguous: false });
});
