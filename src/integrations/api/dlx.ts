import { z } from "zod";
import { apiRequest } from "./client";

export const dlxBalanceSchema = z
  .object({
    season: z.string(),
    confirmed: z.number().int().nonnegative(),
    net_confirmed: z.number().int().nonnegative(),
    held: z.number().int().nonnegative().optional(),
    forfeited: z.number().int().nonnegative().optional(),
    claimable: z.literal(0).optional(), claimable_enabled: z.literal(false).optional(),
    transferable: z.literal(false).optional(), tradable: z.literal(false).optional(),
    on_chain: z.literal(false).optional(), price_status: z.literal("UNAVAILABLE").optional(),
  })
  .passthrough();

export type DlxBalance = z.infer<typeof dlxBalanceSchema>;

export async function loadDlxBalance(initData: string | null, season?: string): Promise<DlxBalance> {
  const response = await apiRequest(`/arena/dlx${season ? `?season=${encodeURIComponent(season)}` : ""}`, { initData, cache: "no-store" });
  return dlxBalanceSchema.parse(await response.json());
}
