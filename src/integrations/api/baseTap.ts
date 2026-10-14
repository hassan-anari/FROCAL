import { z } from "zod";
import { apiRequest } from "./client";

const baseTapResultSchema = z.object({
  created: z.boolean(),
  accepted_taps: z.number().int().nonnegative(),
  rejected_taps: z.number().int().nonnegative(),
  earned_points: z.number().int().nonnegative(),
  pending_points: z.number().int().nonnegative(),
  daily_accepted_taps: z.number().int().nonnegative(),
  daily_remaining_taps: z.number().int().nonnegative(),
  settlement_status: z.string(),
});

export type BaseTapResult = z.infer<typeof baseTapResultSchema>;

/** Receipt-only recovery during the verified paused v1/protocol-2 cutover.
 * Never called for physical touches or unkeyed legacy buffers. */
export async function recoverLegacyTapReceipt(input: {
  tapCount: number;
  initData: string;
  idempotencyKey: string;
  signal: AbortSignal;
}): Promise<BaseTapResult | null> {
  if (!Number.isInteger(input.tapCount) || input.tapCount <= 0) {
    throw new Error("Base Tap batch size must be a positive integer");
  }

  const response = await apiRequest("/base/taps", {
    method: "POST",
    signal: input.signal,
    returnErrorResponse: true,
    initData: input.initData,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({ tap_count: input.tapCount }),
  });

  if (response.status === 409) return null; // Missing/expired receipt; retain all old evidence.
  if (!response.ok) throw new Error("Legacy receipt recovery unavailable");
  const result = baseTapResultSchema.parse(await response.json());
  if (result.created) throw new Error("Legacy cutover barrier changed; recovery must stop");
  return result;
}
