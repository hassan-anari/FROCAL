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

export function createBaseTapIdempotencyKey(): string {
  const entropy =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `base-tap:${entropy}`.slice(0, 100);
}

export async function submitBaseTapBatch(input: {
  tapCount: number;
  initData: string;
  idempotencyKey: string;
}): Promise<BaseTapResult> {
  if (!Number.isInteger(input.tapCount) || input.tapCount <= 0) {
    throw new Error("Base Tap batch size must be a positive integer");
  }

  const response = await apiRequest("/base/taps", {
    method: "POST",
    initData: input.initData,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({ tap_count: input.tapCount }),
  });

  return baseTapResultSchema.parse(await response.json());
}
