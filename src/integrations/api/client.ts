import { readLaunchContext } from "@/integrations/telegram/launch";

const apiBasePath = (import.meta.env.VITE_API_BASE_PATH ?? "/api/v1").replace(/\/+$/, "");
export type ErrorCode = "LAUNCH_DATA_MISSING" | "AUTH_INVALID" | "AUTH_EXPIRED" | "AUTH_REJECTED"
  | "API_UNREACHABLE" | "NETWORK_TIMEOUT" | "API_UNAVAILABLE" | "RATE_LIMITED"
  | "REQUEST_REJECTED" | "RESPONSE_INVALID";
const messages: Record<ErrorCode, string> = {
  LAUNCH_DATA_MISSING: "Telegram launch credentials have not arrived. Retry, or close and reopen the Mini App.",
  AUTH_INVALID: "Telegram could not verify this launch. Close and reopen the Mini App.",
  AUTH_EXPIRED: "Your Telegram authorization expired. Close and reopen the Mini App for a fresh session.",
  AUTH_REJECTED: "Telegram authorization was rejected or expired. Close and reopen the Mini App.",
  API_UNREACHABLE: "The game API could not be reached. Check your connection and retry.",
  NETWORK_TIMEOUT: "The game API took too long to respond. Check your connection and retry.",
  API_UNAVAILABLE: "The game API is temporarily unavailable. Please retry shortly.",
  RATE_LIMITED: "Please wait a moment before retrying.",
  REQUEST_REJECTED: "The game API could not complete this request.",
  RESPONSE_INVALID: "The game API returned an unsupported response. Please retry shortly.",
};
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode, readonly requestId: string | null = null) {
    super(messages[code]); this.name = "ApiError";
  }
}
export function shouldRetry(failureCount: number, error: Error): boolean {
  return failureCount < 2 && error instanceof ApiError
    && ["API_UNREACHABLE", "NETWORK_TIMEOUT", "API_UNAVAILABLE"].includes(error.code);
}

interface ApiRequestOptions extends RequestInit {
  initData?: string | null;
  auth?: boolean;
  timeoutMs?: number;
}
async function responseCode(response: Response): Promise<ErrorCode> {
  // B1 can add machine codes; deployed Ninja auth returns only generic 401.
  let code: unknown;
  try {
    const payload = await response.clone().json() as { code?: unknown; error?: { code?: unknown } };
    code = payload.code ?? payload.error?.code;
  } catch { /* never surface arbitrary server messages/PII */ }
  if (response.status === 401) {
    if (code === "AUTH_EXPIRED" || code === "AUTH_INVALID") return code;
    return "AUTH_REJECTED";
  }
  if (response.status === 429) return "RATE_LIMITED";
  if (response.status >= 500 || response.status === 404) return "API_UNAVAILABLE";
  return "REQUEST_REJECTED";
}
export async function apiRequest(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  if (!path.startsWith("/")) throw new Error("API paths must start with '/'");
  const { initData, auth = true, timeoutMs = 12_000, headers: providedHeaders, signal, ...requestInit } = options;
  const raw = (initData === undefined ? readLaunchContext().initData : initData)?.trim() ?? "";
  if (auth && !raw) throw new ApiError(0, "LAUNCH_DATA_MISSING");
  const headers = new Headers(providedHeaders);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (auth) headers.set("Authorization", `tma ${raw}`);
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  const timer = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(`${apiBasePath}${path}`, { ...requestInit, headers, signal: controller.signal });
    if (!response.ok) throw new ApiError(response.status, await responseCode(response), response.headers.get("X-Request-ID"));
    // Include body delivery in the timeout; callers can still use json()/headers normally.
    const body = await response.arrayBuffer();
    return new Response([204, 205, 304].includes(response.status) ? null : body, { status: response.status, statusText: response.statusText, headers: response.headers });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, timedOut ? "NETWORK_TIMEOUT" : "API_UNREACHABLE");
  } finally {
    window.clearTimeout(timer); signal?.removeEventListener("abort", abort);
  }
}
