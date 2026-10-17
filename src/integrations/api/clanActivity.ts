import type { ClanActivityOut, ClanActivityPage } from "./b6Schemas";
import type { ClanRankStatus } from "@/game/clan/types";
import { clanShopItems } from "@/game/clan/clanCatalog";

export function clanRankLabel(rank: number | null, status?: ClanRankStatus): string {
  if ((status === "RANKED" || status === undefined) && rank !== null && rank > 0) return `#${rank.toLocaleString("en-US")}`;
  return status === "UNRANKED" ? "Unranked" : status === "RECONCILING" ? "Updating" : "Unavailable";
}

/** Stable IDs suppress overlap after refresh/late finalization. Source time is the
 * ordering authority; feed amounts are distinct units, never an income total. */
export function clanActivityRows(pages: ClanActivityPage[] = []): ClanActivityOut[] {
  const rows = new Map<string, ClanActivityOut>();
  for (const page of pages) for (const row of page.items) if (!rows.has(row.id)) rows.set(row.id, row);
  // Preserve the server keyset order, including sub-millisecond source precision.
  return [...rows.values()];
}

export function clanActivityView(row: ClanActivityOut) {
  const actor = row.actor_name || "A member";
  const item = clanShopItems.find(item => item.id === row.item_id)?.name ?? "Clan equipment";
  switch (row.event_type) {
    case "MEMBER_JOINED": return { title: `${actor} joined the Clan`, description: "Telegram membership verified." };
    case "MISSION_COMPLETED": return { title: "Clan mission completed", description: row.actor_name ? `${actor}'s individual mission completed.` : "Group mission completed." };
    case "ITEM_PURCHASED": return { title: `${item} purchased`, description: row.amount != null && row.unit === "TREASURY_CREDITS" ? `${row.amount.toLocaleString()} Treasury credits` : "Added to Clan inventory." };
    case "ITEM_ACTIVATED": return { title: `${item} activated`, description: `Used by ${actor}.` };
    case "TREASURY_CREDIT": case "TREASURY_DEBIT": return { title: `Treasury ${row.event_type === "TREASURY_CREDIT" ? "credit" : "debit"}`, description: row.amount != null && row.unit === "TREASURY_CREDITS" ? `${row.amount.toLocaleString()} credits` : "Treasury updated." };
    case "CLAN_REWARD_SETTLED": return { title: row.amount != null && row.unit === "PLAYER_POINTS" ? `${actor} earned ${row.amount.toLocaleString()} points` : "Clan activity settled", description: [row.treasury_amount != null ? `${row.treasury_amount.toLocaleString()} Treasury credits` : null, row.contribution_amount != null ? `${row.contribution_amount.toLocaleString()} contribution` : null].filter(Boolean).join(" · ") || "Confirmed Clan activity reward." };
  }
}
