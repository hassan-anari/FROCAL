import { z } from "zod";
import { apiRequest, ApiError } from "./client";
export class B3Error extends Error {
  constructor(
    readonly code: string,
    readonly retryAfter: number | null,
  ) {
    super(
      code === "TELEGRAM_VERIFICATION_UNAVAILABLE"
        ? "We couldn't check your Telegram membership right now. Please try again shortly."
        : code === "QUOTA_EXHAUSTED"
          ? "You've used today's attempts. Please return after the reset."
          : code === "MISSION_NOT_READY"
            ? "This mission isn't ready yet. Complete the activity, then check again."
            : code === "GROUP_AUTHORIZATION_UNAVAILABLE"
              ? "We couldn't verify your permission to change broadcasts. Make sure you're a group admin and the bot can send messages, then try again."
              : code === "GROUP_NOT_FOUND"
                ? "This group is no longer available to your account. Refresh your groups and try again."
                : code === "PLAYER_RESTRICTED"
                  ? "Rewards are currently unavailable for your account."
                  : code === "AUTH_EXPIRED"
                    ? "Please close and reopen Dexo Land in Telegram to continue."
                    : "We couldn't complete that action right now. Please try again.",
    );
  }
}
export async function b3Request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { body?: unknown; key?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await apiRequest(path, {
    method: options.body === undefined ? "GET" : "POST",
    signal: options.signal,
    cache: "no-store",
    returnErrorResponse: true,
    headers: {
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.key ? { "Idempotency-Key": options.key } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      code?: string;
      retry_after_seconds?: number;
    };
    const seconds = Number(
      response.headers.get("Retry-After") ?? payload.retry_after_seconds,
    );
    throw new B3Error(
      payload.code ?? "UNAVAILABLE",
      Number.isFinite(seconds) && seconds > 0 ? seconds : null,
    );
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new ApiError(0, "RESPONSE_INVALID");
  return parsed.data;
}
