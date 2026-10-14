import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiError, shouldRetry } from "./client";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); delete window.Telegram; sessionStorage.clear(); history.replaceState({}, "", "/"); });
describe("protected API requests", () => {
  it("forwards current raw initData when a caller omits it; never forwards unsigned user identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal("fetch", fetchMock);
    window.Telegram = { WebApp: { initData: "auth_date=123&hash=signed", initDataUnsafe: { user: { id: 8, first_name: "Untrusted" } } } };
    await apiRequest("/bootstrap");
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("tma auth_date=123&hash=signed");
    delete window.Telegram.WebApp?.initData;
    await expect(apiRequest("/bootstrap")).rejects.toMatchObject({ code: "LAUNCH_DATA_MISSING" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("requires credentials before making a protected Bootstrap request", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/bootstrap", { initData: null })).rejects.toMatchObject({ code: "LAUNCH_DATA_MISSING" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([[401, undefined, "AUTH_REJECTED"], [401, "AUTH_EXPIRED", "AUTH_EXPIRED"], [401, "AUTH_INVALID", "AUTH_INVALID"], [503, undefined, "API_UNAVAILABLE"], [429, undefined, "RATE_LIMITED"]])("classifies HTTP %s / %s", async (status, code, expected) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code, detail: "sensitive arbitrary error" }), { status: status as number, headers: { "X-Request-ID": "trace-1" } })));
    await expect(apiRequest("/bootstrap", { initData: "signed" })).rejects.toMatchObject({ code: expected, requestId: "trace-1" });
    await expect(apiRequest("/bootstrap", { initData: "signed" })).rejects.not.toHaveProperty("message", "sensitive arbitrary error");
  });
  it("classifies an unavailable network independently of Telegram context", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiRequest("/bootstrap", { initData: "signed" })).rejects.toMatchObject({ code: "API_UNREACHABLE" });
  });
  it("bounds network and response-body delivery with an abort timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => options.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))))));
    const promise = apiRequest("/bootstrap", { initData: "signed", timeoutMs: 100 });
    const assertion = expect(promise).rejects.toMatchObject({ code: "NETWORK_TIMEOUT" });
    await vi.advanceTimersByTimeAsync(100); await assertion;
  });
  it("retries only bounded transient reads, never authentication/schema errors", () => {
    expect(shouldRetry(0, new ApiError(0, "API_UNREACHABLE"))).toBe(true);
    expect(shouldRetry(2, new ApiError(503, "API_UNAVAILABLE"))).toBe(false);
    for (const code of ["AUTH_EXPIRED", "AUTH_INVALID", "AUTH_REJECTED", "RESPONSE_INVALID", "LAUNCH_DATA_MISSING"] as const) expect(shouldRetry(0, new ApiError(401, code))).toBe(false);
  });
});
