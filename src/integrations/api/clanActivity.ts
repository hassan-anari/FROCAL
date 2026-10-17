import type { ClanActivityOut, ClanActivityPage, ItemRuleOut } from "./b6Schemas";
import type { ClanRankStatus } from "@/game/clan/types";

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

export function clanActivityView(row: ClanActivityOut, items: readonly Pick<ItemRuleOut, "item_id" | "name">[] = []) {
  const actor = row.actor_name || "A member";
  const item = items.find(item => item.item_id === row.item_id)?.name ?? "Clan equipment";
  switch (row.event_type) {
    case "MEMBER_JOINED": return { title: `${actor} joined the Clan`, description: "Telegram membership verified." };
    case "MISSION_COMPLETED": return { title: "Clan mission completed", description: row.actor_name ? `${actor}'s individual mission completed.` : "Group mission completed." };
    case "ITEM_PURCHASED": return { title: `${item} purchased`, description: row.amount != null && row.unit === "TREASURY_CREDITS" ? `${row.amount.toLocaleString()} Treasury credits` : "Added to Clan inventory." };
    case "ITEM_ACTIVATED": return { title: `${item} activated`, description: `Used by ${actor}.` };
    case "TREASURY_CREDIT": case "TREASURY_DEBIT": return { title: `Treasury ${row.event_type === "TREASURY_CREDIT" ? "credit" : "debit"}`, description: row.amount != null && row.unit === "TREASURY_CREDITS" ? `${row.amount.toLocaleString()} credits` : "Treasury updated." };
    case "CLAN_REWARD_SETTLED": {
      // Distinct server units: a Treasury credit never implies Player points.
      const validAmount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
      const playerAmount = validAmount(row.amount) ? row.amount : null;
      const consistent = row.unit === "PLAYER_POINTS" && playerAmount !== null
        && (row.treasury_amount == null || validAmount(row.treasury_amount))
        && (row.contribution_amount == null || validAmount(row.contribution_amount));
      let title = "Clan activity settled";
      if (consistent && playerAmount !== null && playerAmount > 0) title = `${actor} earned ${playerAmount.toLocaleString()} points`;
      else if (consistent && playerAmount === 0 && validAmount(row.treasury_amount) && row.treasury_amount > 0) title = `${actor} contributed to the Clan Treasury`;
      return {
        title,
        description: [validAmount(row.treasury_amount) ? `${row.treasury_amount.toLocaleString()} Treasury credits` : null, validAmount(row.contribution_amount) ? `${row.contribution_amount.toLocaleString()} contribution` : null].filter(Boolean).join(" · ") || "Confirmed Clan activity reward.",
      };
    }
  }
}
