import { readLaunchContext } from "@/integrations/telegram/launch";

const apiBasePath = (import.meta.env.VITE_API_BASE_PATH ?? "/api/v1").replace(/\/+$/, "");
export type ErrorCode = "LAUNCH_DATA_MISSING" | "AUTH_MISSING" | "AUTH_UNAVAILABLE" | "INITIALIZATION_UNAVAILABLE" | "REQUEST_INVALID" | "AUTH_INVALID" | "AUTH_EXPIRED" | "AUTH_REJECTED"
  | "API_UNREACHABLE" | "NETWORK_TIMEOUT" | "API_UNAVAILABLE" | "RATE_LIMITED"
  | "REQUEST_REJECTED" | "RESPONSE_INVALID";
const messages: Record<ErrorCode, string> = {
  AUTH_MISSING: "Telegram launch credentials were not received by the game API. Retry, or close and reopen the Mini App.",
  AUTH_UNAVAILABLE: "The Telegram authentication service is temporarily unavailable. Please retry shortly.",
  INITIALIZATION_UNAVAILABLE: "Game initialization is temporarily unavailable. Please retry shortly.",
  REQUEST_INVALID: "The game API could not accept this request. Please retry or reopen the Mini App.",
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
  readonly requestId: string | null;
  constructor(readonly status: number, readonly code: ErrorCode, requestId: string | null = null) {
    super(messages[code]); this.name = "ApiError";
    this.requestId = safeRequestId(requestId);
  }
}
export function shouldRetry(failureCount: number, error: Error): boolean {
  return failureCount < 2 && error instanceof ApiError
    && ["API_UNREACHABLE", "NETWORK_TIMEOUT", "API_UNAVAILABLE", "AUTH_UNAVAILABLE", "INITIALIZATION_UNAVAILABLE"].includes(error.code);
}

interface ApiRequestOptions extends RequestInit {
  initData?: string | null;
  auth?: boolean;
  timeoutMs?: number;
}
function safeRequestId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9._-]{1,64}$/.test(value) ? value : null;
}
async function responseError(response: Response): Promise<ApiError> {
  let code: unknown;
  let requestId = safeRequestId(response.headers.get("X-Request-ID"));
  try {
    const payload = await response.clone().json() as { code?: unknown; request_id?: unknown; error?: { code?: unknown } };
    code = payload.code ?? payload.error?.code;
    requestId ??= safeRequestId(payload.request_id);
  } catch { /* arbitrary server detail/credentials never enter the error message */ }
  let classification: ErrorCode = "REQUEST_REJECTED";
  if (response.status === 401) {
    classification = code === "AUTH_MISSING" || code === "AUTH_EXPIRED" || code === "AUTH_INVALID" ? code : "AUTH_REJECTED";
  } else if (response.status === 503 && (code === "AUTH_UNAVAILABLE" || code === "INITIALIZATION_UNAVAILABLE")) {
    classification = code;
  } else if ((response.status === 400 || response.status === 422) && code === "REQUEST_INVALID") {
    classification = code;
  } else if (response.status === 429) classification = "RATE_LIMITED";
  else if (response.status >= 500 || response.status === 404) classification = "API_UNAVAILABLE";
  return new ApiError(response.status, classification, requestId);
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
    if (!response.ok) throw await responseError(response);
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
