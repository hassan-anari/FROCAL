import { expect, it, vi } from "vitest";
import type { PostHog } from "posthog-js";
import { guardSdkTransport } from "./transport";
it("blocks dispatch while opted out, stale retries after reconsent, and previous-player data", () => {
  const direct = vi.fn(); const retry = vi.fn();
  const sdk = { _send_request: direct, _retryQueue: { retriableRequest: retry } };
  const current = { allowed: true, generation: 1, identity: "player-a" };
  guardSdkTransport(sdk as unknown as PostHog, () => current);
  const request = { data: { event: "$pageview", properties: { distinct_id: "player-a" } } };
  sdk._retryQueue.retriableRequest(request); expect(retry).toHaveBeenCalledOnce();
  current.allowed = false;
  sdk._send_request(request); sdk._retryQueue.retriableRequest(request);
  expect(direct).not.toHaveBeenCalled(); expect(retry).toHaveBeenCalledOnce();
  current.allowed = true; current.generation++;
  // SDK retries copy request options, including symbol keys, before dispatch.
  sdk._retryQueue.retriableRequest({ ...request }); expect(retry).toHaveBeenCalledOnce();
  current.identity = "player-b";
  sdk._send_request({ data: request.data }); expect(direct).not.toHaveBeenCalled();
  sdk._send_request({ data: { event: "$pageview", properties: { distinct_id: "player-b" } } }); expect(direct).toHaveBeenCalledOnce();
});
it("fails closed if a future SDK changes the pinned dispatch shape", () => {
  expect(() => guardSdkTransport({} as PostHog, () => ({ allowed: true, generation: 1, identity: "hashed" }))).toThrow("Unsupported analytics transport");
});
