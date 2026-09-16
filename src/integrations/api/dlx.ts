import { z } from "zod";
import { apiRequest } from "./client";

const dlxBalanceSchema = z
  .object({
    season: z.string(),
    confirmed: z.number().int().nonnegative(),
    net_confirmed: z.number().int().nonnegative(),
  })
  .passthrough();

export type DlxBalance = z.infer<typeof dlxBalanceSchema>;

export async function loadDlxBalance(initData: string | null): Promise<DlxBalance> {
  const response = await apiRequest("/arena/dlx", { initData });
  return dlxBalanceSchema.parse(await response.json());
}
