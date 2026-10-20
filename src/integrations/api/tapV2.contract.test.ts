import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { tapBatchInputSchema, tapBatchResultSchema, tapErrorSchema, tapStateSchema } from "./tapV2Contract";
import { createTapPort, normalizeTapState } from "./tapV2";
import { journalSchema } from "@/game/base/tapV2/model";

const fixture = JSON.parse(readFileSync("src/integrations/api/fixtures/tap-v2.json", "utf8"));
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
it("retains every field from the exact reviewed backend B2 fixtures", () => {
  expect(tapStateSchema.parse(fixture.initial_state)).toEqual(fixture.initial_state);
  expect(tapBatchInputSchema.parse(fixture.batch_request)).toEqual(fixture.batch_request);
  expect(tapBatchResultSchema.parse(fixture.batch_response)).toEqual(fixture.batch_response);
  expect(tapBatchResultSchema.parse(fixture.duplicate_response)).toEqual(fixture.duplicate_response);
  for (const name of ["partial_response", "recovered_previous_lease_response", "partial_recovery_response"]) {
    expect(tapBatchResultSchema.parse(fixture[name])).toEqual(fixture[name]);
  }
  expect(tapStateSchema.parse(fixture.state_after_daily_reward)).toEqual(fixture.state_after_daily_reward);
  for (const error of fixture.errors) expect(tapErrorSchema.parse(error)).toEqual(error);
});

it.each(["idempotency_key", "lease_id", "session_id", "generation", "sequence_start", "requested_taps", "season_id", "config_version", "earned_points"])("refuses receipt identity/count tampering: %s", async (field) => {
  const result = structuredClone(fixture.batch_response);
  result.receipt[field] = typeof result.receipt[field] === "number" ? result.receipt[field] + 1
    : field.endsWith("_id") && field !== "season_id" ? "00000000-0000-4000-8000-000000000099" : "different";
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(result))));
  const snapshot = normalizeTapState(fixture.initial_state);
  await expect(createTapPort("100", "isolated").submit({ scope: snapshot.grant!.scope,
    key: fixture.batch_request.idempotency_key, sequences: Array.from({ length: 25 }, (_, i) => i + 1) }, new AbortController().signal))
    .rejects.toMatchObject({ code: "RESPONSE_INVALID" });
});

it("uses actual authenticated routes, session UUID and immutable request bodies", async () => {
  const requests: Array<{ path: string; body?: unknown }> = [];
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    expect(new Headers(options.headers).get("Authorization")).toBe("tma isolated-signed-fixture");
    requests.push({ path: url, body: options.body ? JSON.parse(String(options.body)) : undefined });
    return new Response(JSON.stringify(url.includes("tap-batches") ? fixture.batch_response : fixture.initial_state));
  });
  vi.stubGlobal("fetch", fetcher);
  const port = createTapPort(fixture.initial_state.player_id, "isolated-signed-fixture");
  const journal = journalSchema.parse({ version: 1, player: fixture.initial_state.player_id, session: fixture.lease_request.session_id, events: [], batches: [] });
  const snapshot = await port.synchronize(journal, new AbortController().signal);
  expect(requests[0].path).toBe(`/api/v1/base/v2/tap-state?session_id=${fixture.lease_request.session_id}`);
  const batch = { scope: snapshot.grant!.scope, key: fixture.batch_request.idempotency_key, sequences: Array.from({ length: 25 }, (_, index) => index + 1) };
  const result = await port.submit(batch, new AbortController().signal);
  expect(requests.at(-1)?.body).toEqual(fixture.batch_request);
  expect(result.receipts[0]).toMatchObject({ key: batch.key, accepted: 25, rejected: 0, through: 25, receiptId: fixture.batch_response.receipt_id });
  expect(result).not.toHaveProperty("acknowledgements");
  expect(result.receiptCursor).toBe(fixture.batch_response.snapshot.receipt_cursor);
});

it("accepts short ingress rate-limit envelopes and preserves Retry-After", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "rate limited", code: "RATE_LIMITED" }), { status: 429, headers: { "Retry-After": "3" } })));
  await expect(createTapPort("100", "isolated").synchronize(journalSchema.parse({ version: 1, player: "100", session: fixture.lease_request.session_id, events: [], batches: [] }), new AbortController().signal))
    .rejects.toMatchObject({ code: "RATE_LIMITED", retryAfterMs: 3000, kind: "rate-limit" });
});

it("keeps a pinned lease config separate from the current progression config", () => {
  const state = structuredClone(fixture.initial_state);
  state.config_version = "new-current-progression-config";
  const normalized = normalizeTapState(state);
  expect(normalized.config).toBe("new-current-progression-config");
  expect(normalized.grant!.scope.config).toBe(fixture.initial_state.lease.config_version);
});

it("cutoff forbids fresh lease issuance even if an older Tap state still permits earning", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(url);
    return new Response(JSON.stringify({ ...fixture.initial_state, lease: null, cooldown_until: null, burst_remaining: 50 }));
  }));
  const journal = journalSchema.parse({ version: 1, player: "100", session: fixture.lease_request.session_id, events: [], batches: [] });
  await createTapPort("100", "isolated", ["100"], () => false).synchronize(journal, new AbortController().signal);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toContain("tap-state");
});

it.each(["committed", "expired"])("reconciles an exact %s batch after cutoff without issuing a lease", async mode => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const snapshot = normalizeTapState(fixture.initial_state);
  const sequences = Array.from({ length: fixture.batch_request.tap_count }, (_, i) => fixture.batch_request.sequence_start + i);
  const batch = { scope: snapshot.grant!.scope, key: fixture.batch_request.idempotency_key, sequences, attempts: 1, blocked: false };
  const journal = journalSchema.parse({ version: 1, player: "100", session: fixture.lease_request.session_id, events: sequences.map(sequence => ({ scope: batch.scope, sequence })), batches: [batch] });
  vi.stubGlobal("fetch", vi.fn(async (url: string, options: RequestInit) => {
    calls.push({ url, body: options.body ? JSON.parse(String(options.body)) : undefined });
    if (url.endsWith("tap-batches")) return mode === "committed" ? new Response(JSON.stringify(fixture.duplicate_response))
      : new Response(JSON.stringify({ code: "LEASE_EXPIRED", detail: "expired", retryable: false, retry_after_ms: null }), { status: 409 });
    return new Response(JSON.stringify({ ...fixture.batch_response.snapshot, lease: null, reward_earning_allowed: false }));
  }));
  const result = await createTapPort("100", "isolated", ["100"], () => false).synchronize(journal, new AbortController().signal);
  expect(calls.filter(c => c.url.endsWith("tap-batches"))).toEqual([{ url: "/api/v1/base/v2/tap-batches", body: fixture.batch_request }]);
  expect(calls.some(c => c.url.endsWith("tap-leases"))).toBe(false);
  if (mode === "committed") expect(result.receipts[0]).toMatchObject({ key: batch.key, accepted: fixture.batch_response.accepted_taps });
  else expect(result.rejections[0]).toMatchObject({ key: batch.key, code: "LEASE_EXPIRED" });
});
