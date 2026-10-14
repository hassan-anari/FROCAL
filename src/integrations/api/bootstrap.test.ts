import { afterEach, expect, it, vi } from "vitest";
import { loadBootstrap, mapRemoteBootstrap, remoteBootstrapSchema } from "./bootstrap";
import { legacyBootstrap } from "./bootstrapFixture.test-data";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
it("retains validated progression, config and feature payloads from the deployed backend", () => {
  const payload = remoteBootstrapSchema.parse({ ...legacyBootstrap, daily: { claimable: true, streak: 2, cycle_day: 3, reward_amount: 50, next_reset: "2026-10-15T00:00:00Z" } });
  const mapped = mapRemoteBootstrap(payload, "telegram", "request-id", null);
  expect(mapped.player).toMatchObject({ id: "42", level: 7, lifetimeXp: 321, xp: 21, xpToNextLevel: 200 });
  expect(mapped.dexo.stage).toBe("specialist"); expect(mapped.remote?.config.version).toBe("legacy-v1");
  expect(mapped.remote?.daily?.streak).toBe(2);
});
it("represents no active Season explicitly while preserving lifetime identity", () => {
  const mapped = mapRemoteBootstrap(remoteBootstrapSchema.parse({ ...legacyBootstrap, season: null }), "telegram", null, null);
  expect(mapped.season.id).toBe("no-active-season"); expect(mapped.featureFlags.season).toBe(false);
  expect(mapped.player.lifetimeXp).toBe(321);
});
it("never silently falls back to local identity or progression on malformed remote data", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "remote"); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{}')));
  await expect(loadBootstrap("new-user", "telegram", "signed-fixture")).rejects.toMatchObject({ code: "RESPONSE_INVALID" });
});
it("keeps explicitly selected browser demo scenarios", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "local");
  const result = await loadBootstrap("new-user", "browser");
  expect(result.environment).toBe("browser"); expect(result.remote).toBeUndefined();
});
