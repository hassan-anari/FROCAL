import { afterEach, expect, it, vi } from "vitest";
import fixture from "./fixtures/bootstrap-b1.json";
import errorFixtures from "./fixtures/bootstrap-b1-errors.json";
import sourcePin from "../../../scripts/contracts/source-pin.json";
import backendSchema from "../../../scripts/contracts/backend-bootstrap-schema.json";
import { mapRemoteBootstrap, remoteBootstrapSchema } from "./bootstrap";
import { configCacheScope, profilePhotoUrl } from "./bootstrapContract";
import { legacyBootstrap } from "./bootstrapFixture.test-data";
import { apiRequest, ApiError, shouldRetry } from "./client";

afterEach(() => vi.unstubAllGlobals());
it("consumes the exact fixture serialized by reviewed backend BootstrapOutput with no discarded fields", () => {
  expect(sourcePin.commit).toBe("cadc257fbed5c6bf36e31c767e70f4cd430e350d");
  expect(Object.keys(fixture).sort()).toEqual(Object.keys(backendSchema.properties).sort());
  const parsed = remoteBootstrapSchema.parse(fixture);
  expect(parsed).toEqual(fixture);
  const mapped = mapRemoteBootstrap(parsed, "telegram", "different-header-id", "2020-01-01T00:00:00Z");
  expect(mapped.remote).toEqual(fixture);
  expect(mapped.requestId).toBe(fixture.request_id);
  expect(mapped.serverTime).toBe("2026-10-14T12:00:00.000Z");
  expect(mapped.player).toMatchObject({ id: "42", languageCode: "en", avatarUrl: fixture.player.photo_url, level: 7 });
  expect(mapped.remote?.config.progression).toEqual(fixture.config.progression);
  expect(mapped.remote?.config.payload_checksum).toBe(fixture.config.payload_checksum);
  expect(mapped.featureFlags).toMatchObject(fixture.features);
});
it("keeps disabled Clan disabled above the configured level, and uses the server Arena flag", () => {
  expect(fixture.progression.level).toBeGreaterThanOrEqual(fixture.config.progression.clan_min_level);
  const mapped = mapRemoteBootstrap(remoteBootstrapSchema.parse(fixture), "telegram", null, null);
  expect(mapped.featureFlags.clan).toBe(false);
  expect(mapped.featureFlags.arena).toBe(true);
  const disabledArena = remoteBootstrapSchema.parse({ ...fixture, features: { ...fixture.features, arena: false } });
  expect(mapRemoteBootstrap(disabledArena, "telegram", null, null).featureFlags.arena).toBe(false);
});
it("retains deployed legacy responses without requiring any additive B1 fields", () => {
  const parsed = remoteBootstrapSchema.parse(legacyBootstrap);
  expect(parsed).toEqual(legacyBootstrap);
  const mapped = mapRemoteBootstrap(parsed, "telegram", "legacy-trace", null);
  expect(mapped.player.id).toBe("42"); expect(mapped.player.avatarUrl).toBeNull();
  expect(mapped.featureFlags.clan).toBe(true);
  expect(mapped.remote?.features).toBeUndefined(); expect(mapped.remote?.gameplay).toBeUndefined();
  expect(configCacheScope(parsed.config)).toBe("legacy-v1");
});
it("uses the authoritative stable player id rather than unsigned identity or a client-derived key", () => {
  const parsed = remoteBootstrapSchema.parse({ ...fixture, player: { ...fixture.player, id: "canonical-player" } });
  expect(mapRemoteBootstrap(parsed, "telegram", null, null).player.id).toBe("canonical-player");
});
it("validates optional additions when present instead of discarding malformed backend data", () => {
  for (const changed of [
    { features: { ...fixture.features, clan: "false" } },
    { gameplay: { ...fixture.gameplay, reward_earning_allowed: "true" } },
    { config: { ...fixture.config, progression: { ...fixture.config.progression, levels: [{ level: "7", min_lifetime_points: 300 }] } } },
    { player: { ...fixture.player, photo_url: 123 } },
    { server_time: "invalid-date" },
  ]) expect(remoteBootstrapSchema.safeParse({ ...fixture, ...changed }).success).toBe(false);
});
it("preserves unsafe photo metadata for diagnostics-free contract retention but does not place it in images", () => {
  expect(profilePhotoUrl("javascript:alert(1)")).toBeNull();
  const parsed = remoteBootstrapSchema.parse({ ...fixture, player: { ...fixture.player, photo_url: "not-a-url" } });
  const mapped = mapRemoteBootstrap(parsed, "telegram", null, null);
  expect(mapped.remote?.player.photo_url).toBe("not-a-url"); expect(mapped.player.avatarUrl).toBeNull();
});
it("isolates config payload/schema turnover even when the version string stays the same", () => {
  const first = remoteBootstrapSchema.parse(fixture).config;
  expect(configCacheScope(first)).not.toBe(configCacheScope({ ...first, payload_checksum: "b".repeat(64) }));
  expect(configCacheScope(first)).not.toBe(configCacheScope({ ...first, schema_version: 2 }));
});
it.each(errorFixtures)("handles reviewed B1 error $code with sanitized text and correlation", async (payload) => {
  const status = payload.code === "AUTH_UNAVAILABLE" || payload.code === "INITIALIZATION_UNAVAILABLE" ? 503 : payload.code === "REQUEST_INVALID" ? 422 : 401;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status })));
  const request = apiRequest("/bootstrap", { initData: "synthetic-signed" });
  await expect(request).rejects.toMatchObject({ code: payload.code, requestId: payload.request_id });
  await expect(request).rejects.not.toHaveProperty("message", payload.detail);
});
it("bounds service-unavailable retries and never retries rejected credentials or invalid input", () => {
  for (const code of ["AUTH_UNAVAILABLE", "INITIALIZATION_UNAVAILABLE"] as const) {
    expect(shouldRetry(0, new ApiError(503, code))).toBe(true); expect(shouldRetry(2, new ApiError(503, code))).toBe(false);
  }
  expect(shouldRetry(0, new ApiError(401, "AUTH_MISSING"))).toBe(false);
  expect(shouldRetry(0, new ApiError(422, "REQUEST_INVALID"))).toBe(false);
});
it("does not expose credentials embedded in an arbitrary server request_id or detail", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "AUTH_UNAVAILABLE", detail: "tma raw-secret", request_id: "auth_date=123&hash=raw-secret" }), { status: 503 })));
  await expect(apiRequest("/bootstrap", { initData: "synthetic-signed" })).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE", requestId: null });
});
