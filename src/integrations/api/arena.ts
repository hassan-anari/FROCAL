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
export const playerRankPageSchema = z.object({ items: z.array(playerRankSchema), own_standing: playerRankSchema.nullable(), offset: count, limit: z.number().int().positive() });
export const clanRankPageSchema = z.object({ items: z.array(clanRankSchema), own_standing: clanRankSchema.nullable(), offset: count, limit: z.number().int().positive() });
export type RankingRow = z.infer<typeof playerRankSchema> | z.infer<typeof clanRankSchema>;
export type RankingPage = { items: RankingRow[]; own_standing: RankingRow | null; offset: number; limit: number };
export async function loadRankings(mode: "players" | "clans", offset: number, signal?: AbortSignal): Promise<RankingPage> {
  const response = await apiRequest(`/arena/rankings/${mode}?offset=${offset}&limit=30`, { signal, cache: "no-store" });
  const payload: unknown = await response.json();
  return mode === "players" ? playerRankPageSchema.parse(payload) : clanRankPageSchema.parse(payload);
}
