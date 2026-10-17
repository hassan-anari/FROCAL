import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ClanRecentActivity } from "./ClanRecentActivity";
import { clanActivityView } from "@/integrations/api/clanActivity";
import type { ClanActivityOut } from "@/integrations/api/b6Schemas";
import { ClanActivityPage } from "@/integrations/api/b6Schemas";
import type { ClanRemote } from "@/integrations/api/useClanRemote";
import rollover from "../../../docs/evidence/b6-zero-net/zero-net-activity-http.json";

const source: ClanActivityOut = { id: "settlement:confirmed", event_type: "CLAN_REWARD_SETTLED", actor_name: "Ali", occurred_at: "2026-10-17T10:00:00.123456Z", amount: 1, unit: "PLAYER_POINTS", treasury_amount: 0, contribution_amount: 1 };
function renderRow(row: ClanActivityOut) {
  return render(<ClanRecentActivity live={{ activity: { data: { pages: [{ items: [row], next_cursor: null, as_of: "2026-10-17T11:00:00Z" }] }, isPending: false, isError: false }, equipment: {} } as unknown as ClanRemote} />);
}
const cases: [string, Partial<ClanActivityOut>, string, string][] = [
  ["positive Player, zero Treasury", {}, "Ali earned 1 points", "0 Treasury credits · 1 contribution"],
  ["positive Player and Treasury", { amount: 9, treasury_amount: 1, contribution_amount: 10 }, "Ali earned 9 points", "1 Treasury credits · 10 contribution"],
  ["zero Player, positive Treasury", { amount: 0, treasury_amount: 1 }, "Ali contributed to the Clan Treasury", "1 Treasury credits · 1 contribution"],
  ["positive Player, missing optional amounts", { treasury_amount: undefined, contribution_amount: undefined }, "Ali earned 1 points", "Confirmed Clan activity reward."],
  ["all missing amounts", { amount: undefined, treasury_amount: undefined, contribution_amount: undefined }, "Clan activity settled", "Confirmed Clan activity reward."],
  ["null amounts", { amount: null, treasury_amount: null, contribution_amount: null }, "Clan activity settled", "Confirmed Clan activity reward."],
  ["missing Player amount with Treasury", { amount: undefined, treasury_amount: 1 }, "Clan activity settled", "1 Treasury credits · 1 contribution"],
  ["zero Player, missing Treasury", { amount: 0, treasury_amount: undefined }, "Clan activity settled", "1 contribution"],
  ["zero Player and Treasury", { amount: 0 }, "Clan activity settled", "0 Treasury credits · 1 contribution"],
  ["inconsistent unit", { amount: 0, treasury_amount: 1, unit: "TREASURY_CREDITS" }, "Clan activity settled", "1 Treasury credits · 1 contribution"],
  ["missing unit", { unit: undefined }, "Clan activity settled", "0 Treasury credits · 1 contribution"],
  ["negative Player amount", { amount: -1 }, "Clan activity settled", "0 Treasury credits · 1 contribution"],
  ["negative Treasury amount", { treasury_amount: -1 }, "Clan activity settled", "1 contribution"],
  ["negative Contribution amount", { contribution_amount: -1 }, "Clan activity settled", "0 Treasury credits"],
];
it.each(cases)("maps and renders %s without inventing rewards", (_name, patch, title, description) => {
  const row = { ...source, ...patch }, original = structuredClone(row);
  expect(clanActivityView(row)).toEqual({ title, description });
  const { container } = renderRow(row);
  expect(screen.getByText(title, { selector: "strong" })).toBeVisible();
  expect(screen.getByText(description, { selector: "p" })).toBeVisible();
  expect(screen.queryByText(/earned 0 points/)).not.toBeInTheDocument();
  expect(container.querySelector("article")).toHaveAttribute("data-activity-id", source.id);
  expect(container.querySelector("time")).toHaveAttribute("datetime", source.occurred_at);
  expect(row).toEqual(original);
});
it.each<[ClanActivityOut["event_type"], string, string]>([
  ["MEMBER_JOINED", "Ali joined the Clan", "Telegram membership verified."],
  ["MISSION_COMPLETED", "Clan mission completed", "Ali's individual mission completed."],
  ["ITEM_PURCHASED", "Clan equipment purchased", "1 Treasury credits"],
  ["ITEM_ACTIVATED", "Clan equipment activated", "Used by Ali."],
  ["TREASURY_CREDIT", "Treasury credit", "1 credits"],
  ["TREASURY_DEBIT", "Treasury debit", "1 credits"],
])("keeps %s mapping and rendered copy unchanged", (event_type, title, description) => {
  const row = { ...source, event_type, unit: "TREASURY_CREDITS" as const };
  expect(clanActivityView(row)).toEqual({ title, description });
  renderRow(row);
  expect(screen.getByText(title, { selector: "strong" })).toBeVisible();
  expect(screen.getByText(description, { selector: "p" })).toBeVisible();
});

it("renders the unmodified real B6 paired zero-net Treasury rollover", () => {
  const page = ClanActivityPage.parse(rollover);
  const row = page.items.find(row => row.event_type === "CLAN_REWARD_SETTLED" && row.amount === 0)!;
  expect(row).toMatchObject({ unit: "PLAYER_POINTS", treasury_amount: 1, contribution_amount: 1 });
  const title = `${row.actor_name || "A member"} contributed to the Clan Treasury`;
  expect(clanActivityView(row)).toEqual({ title, description: "1 Treasury credits · 1 contribution" });
  const { container } = renderRow(row);
  expect(screen.getByText(title, { selector: "strong" })).toBeVisible();
  expect(screen.getByText("1 Treasury credits · 1 contribution", { selector: "p" })).toBeVisible();
  expect(screen.queryByText(/earned 0 points/)).not.toBeInTheDocument();
  expect(container.querySelector("time")).toHaveAttribute("datetime", row.occurred_at);
  expect(container.querySelector("article")).toHaveAttribute("data-activity-id", row.id);
});
