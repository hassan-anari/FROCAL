import { z } from "zod";
import { apiRequest } from "./client";
const count = z.number().int().nonnegative();
const id = z.union([z.string().min(1), z.number().int().positive()]).transform(String);
export const playerRankSchema = z.object({
  rank: z.number().int().positive(), player_id: id, first_name: z.string(), username: z.string(), avatar_url: z.string().nullable(),
  level: z.number().int().positive(), season_points: count,
  clan: z.object({ name: z.string(), tag: z.string() }).nullable(),
});
export const clanRankSchema = z.object({
  rank: z.number().int().positive(), clan_id: id, name: z.string(), tag: z.string(), crest: z.string().nullable(),
  hq_level: z.number().int().positive(), member_count: count, capacity: count, competitive_score: count,
});
const metadata = { season: z.string().optional(), season_status: z.string().optional(), archived: z.boolean().optional(), as_of: z.string().optional(), total_count: count.optional(), next_offset: count.nullable().optional() };
export const playerRankPageSchema = z.object({ ...metadata, items: z.array(playerRankSchema), own_standing: playerRankSchema.nullable(), offset: count, limit: z.number().int().positive() });
export const clanRankPageSchema = z.object({ ...metadata, items: z.array(clanRankSchema), own_standing: clanRankSchema.nullable(), offset: count, limit: z.number().int().positive() });
export type RankingRow = z.infer<typeof playerRankSchema> | z.infer<typeof clanRankSchema>;
export type RankingPage = Omit<z.infer<typeof playerRankPageSchema>, "items" | "own_standing"> & { items: RankingRow[]; own_standing: RankingRow | null };
export async function loadRankings(mode: "players" | "clans", offset: number, signal?: AbortSignal, season?: string): Promise<RankingPage> {
  const response = await apiRequest(`/arena/rankings/${mode}?offset=${offset}&limit=30${season ? `&season=${encodeURIComponent(season)}` : ""}`, { signal, cache: "no-store" });
  const payload: unknown = await response.json();
  const page = mode === "players" ? playerRankPageSchema.parse(payload) : clanRankPageSchema.parse(payload);
  if (season && page.season !== undefined && page.season !== season) throw new Error("Ranking season mismatch");
  return page;
}

const seasonSchema = z.object({ code: z.string(), title: z.string(), status: z.string(), starts_at: z.string(), ends_at: z.string() });
export const arenaStateSchema = z.object({ season: seasonSchema.nullable(), seasons: z.array(seasonSchema), warfront: z.object({ state: z.literal("LOCKED"), available_season: z.literal(2), message: z.string() }), wallet_enabled: z.literal(false), account_link_enabled: z.literal(false) });
/** Typed archive read only; no archive selector or locked-surface repurposing. */
export async function loadArenaState(signal?: AbortSignal) {
  const response = await apiRequest("/arena/state", { signal, cache: "no-store" });
  return arenaStateSchema.parse(await response.json());
}
