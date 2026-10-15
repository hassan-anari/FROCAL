import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import { createTapPort, normalizeTapState } from "./tapV2";
import { tapStateSchema } from "./tapV2Contract";
import { journalSchema } from "@/game/base/tapV2/model";
const fixture = JSON.parse(readFileSync("src/integrations/api/fixtures/b3/session-switch.json", "utf8"));
const journal = journalSchema.parse({ version: 1, player: "100", session: fixture.switch_request.session_id, events: [], batches: [] });
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });

it("retains the backend-generated B3 ownership states and observed generation exactly", () => {
  for (const key of ["initial", "another_device", "switch_response", "moved"]) {
    expect(tapStateSchema.parse(fixture[key])).toEqual(fixture[key]);
    expect(normalizeTapState(fixture[key]).ownership).toMatchObject({ generation: fixture[key].generation, status: fixture[key].ownership.status });
  }
});

it.each([["another_device", "ACTIVE_SESSION"], ["moved", "LEASE_REVOKED"]])("never automatically acquires after %s, while retaining canonical snapshot evidence", async (key, code) => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(fixture[key])));
  vi.stubGlobal("fetch", fetcher);
  await expect(createTapPort("100", "isolated").synchronize(journal, new AbortController().signal)).rejects.toMatchObject({ code, snapshot: { ownership: { explicitSwitchRequired: true } } });
  for (const [, options] of fetcher.mock.calls as unknown as Array<[string, RequestInit]>) expect(options.method ?? "GET").toBe("GET");
});

it("switches only through the exact backend contract, with a generation confirmed by the user", async () => {
  const requests: Array<{ path: string; body: unknown }> = [];
  vi.stubGlobal("fetch", vi.fn(async (path: string, options: RequestInit) => {
    expect(new Headers(options.headers).get("Authorization")).toBe("tma isolated");
    requests.push({ path, body: options.body ? JSON.parse(String(options.body)) : null });
    return new Response(JSON.stringify(path.endsWith("tap-leases") ? fixture.switch_response : fixture.another_device));
  }));
  const port = createTapPort("100", "isolated");
  const result = await port.switchSession!(journal, fixture.switch_request.expected_generation, new AbortController().signal);
  expect(requests.at(-1)?.body).toEqual(fixture.switch_request);
  expect(result.ownership?.status).toBe("OWNED");
});

it("rejects a generation race without retrying takeover or minting another request", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(fixture.moved)));
  vi.stubGlobal("fetch", fetcher);
  await expect(createTapPort("100", "isolated").switchSession!(journal, fixture.switch_request.expected_generation, new AbortController().signal))
    .rejects.toMatchObject({ code: "GENERATION_STALE" });
  expect(fetcher).toHaveBeenCalledTimes(1);
  for (const [, options] of fetcher.mock.calls as unknown as Array<[string, RequestInit]>) expect(options.method ?? "GET").toBe("GET");
});

it("releases the exact acknowledged lease through authenticated keepalive without a new idempotency key", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify(fixture.moved)));
  vi.stubGlobal("fetch", fetcher);
  const grant = normalizeTapState(fixture.initial).grant!;
  await createTapPort("100", "isolated").releaseSession!(grant, new AbortController().signal);
  const [path, options] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(path).toBe("/api/v1/base/v2/tap-release");
  expect(options.keepalive).toBe(true);
  expect(JSON.parse(String(options.body))).toEqual({ lease_id: grant.scope.lease, session_id: grant.scope.session, generation: grant.scope.generation });
});
