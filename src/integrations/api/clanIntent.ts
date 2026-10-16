import { ClanApiError } from "./b5";
/** Opaque mutation intent only. No credentials, balances, entitlements or API replies. */
export async function clanEconomicIntent<T>(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, scope: { player: string; season: string; membership: number }, action: "purchase" | "activate", item: string, send: (key: string) => Promise<T>): Promise<T> {
  // Configuration refresh must not mint another intent after an uncertain response.
  // A different membership must never replay a purchase from a previous Clan.
  const journal = `dalexio-clan-intent:${scope.player}:${scope.season}:${scope.membership}:${action}:${item}`;
  const key = storage.getItem(journal) || crypto.randomUUID();
  storage.setItem(journal, key); // Fail closed before any request if durability is unavailable.
  try {
    const result = await send(key);
    storage.removeItem(journal);
    return result;
  } catch (error) {
    if (error instanceof ClanApiError && error.status >= 400 && error.status < 500 && error.status !== 429) storage.removeItem(journal);
    throw error;
  }
}
