import type { PostHog } from "posthog-js";

/** posthog-js is exactly pinned. Its public opt-out stops new capture but its
 * request/retry queues can still deliver previously captured data. Fence those
 * two dispatch paths as well, without replacing global fetch/XHR or API traffic.
 * A changed SDK shape fails closed at initialization and is covered in a release
 * browser test. No private queue contents are read or modified. */
export function guardSdkTransport(sdk: PostHog, state: () => { allowed: boolean; generation: number; identity: string | null }) {
  const epoch = Symbol("frocalConsentGeneration");
  type Request = { data?: any; [epoch]?: number };
  type Dispatch = (request: Request, ...rest: any[]) => unknown;
  type Transport = { _send_request: Dispatch; _retryQueue: { retriableRequest: Dispatch } };
  const transport = sdk as unknown as Transport;
  if (typeof transport._send_request !== "function" || typeof transport._retryQueue?.retriableRequest !== "function") throw new Error("Unsupported analytics transport");
  const wrap = (send: Dispatch): Dispatch => function (this: unknown, request, ...rest) {
    const current = state();
    if (!current.allowed) return;
    if (request[epoch] === undefined) request[epoch] = current.generation;
    if (request[epoch] !== current.generation) return;
    const data = request.data;
    const events = Array.isArray(data) ? data : data?.batch ?? (data?.event ? [data] : []);
    if (events.some((event: any) => event.properties?.distinct_id !== current.identity)) return;
    return send.call(this, request, ...rest);
  };
  transport._send_request = wrap(transport._send_request);
  transport._retryQueue.retriableRequest = wrap(transport._retryQueue.retriableRequest);
}
