import type { ClanSummary } from "@/game/clan/types";
const key = (player: string, clan: number) => `dalexio-clan-tone:${player}:${clan}`;
/** Existing identity-tone control is a cosmetic preference, never authoritative Clan state. */
export function clanTone(player: string, clan: number): ClanSummary["accent"] {
  try {
    const value = localStorage.getItem(key(player, clan));
    if (value === "cyan" || value === "violet" || value === "gold" || value === "blue") return value;
  } catch { /* Optional cosmetic persistence. */ }
  return "cyan";
}
export function saveClanTone(player: string, clan: number, tone: ClanSummary["accent"]): void {
  try { localStorage.setItem(key(player, clan), tone); } catch { /* Never fail a confirmed creation for a cosmetic preference. */ }
}
