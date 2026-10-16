import { canonicalSchema } from "./b3Contracts";
import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { mapRemoteBootstrap, remoteBootstrapSchema } from "./bootstrap";
import fixture from "./fixtures/b3/earn-network.json";
import { configCacheScope } from "./bootstrapContract";
import { canonicalKey, commitCanonical } from "./canonical";
import { queryKeys } from "./queryKeys";
import { createTapCacheBridge } from "@/game/base/tapV2/cacheBridge";
import { internalSnapshot } from "@/game/base/tapV2/testing.fixture";
it("orders non-Tap claims and delayed Tap receipts without touching pending journals or unrelated currencies", () => {
  const client = new QueryClient();
  const remote = remoteBootstrapSchema.parse(fixture.bootstrap);
  const scope = {
    session: 1,
    player: remote.canonical!.player_id,
    season: remote.season!.code,
    config: configCacheScope(remote.config),
  };
  const key = queryKeys.bootstrap(1, "remote", "new-user", "telegram");
  client.setQueryData(key, mapRemoteBootstrap(remote, "telegram", null, null));
  client.setQueryData(queryKeys.dlxBalance(scope), { balance: 19 });
  const journal = '{"pending":"immutable evidence"}';
  localStorage.setItem(`dalexio-tap-v2:${scope.player}`, journal);
  expect(
    commitCanonical(
      client,
      scope,
      canonicalSchema.parse(fixture.typing_claim.response.canonical),
    ),
  ).toBe(true);
  expect(
    commitCanonical(
      client,
      scope,
      canonicalSchema.parse(fixture.daily_claim.response.canonical),
    ),
  ).toBe(false);
  const tap = {
    ...internalSnapshot(),
    player: scope.player,
    season: scope.season,
    config: remote.config.version,
    receiptCursor: 2,
    lifetime: 200,
  };
  createTapCacheBridge(client, scope)(tap);
  expect(client.getQueryData(key)).toMatchObject({
    player: { lifetimeXp: 270, seasonScore: 270 },
  });
  expect(client.getQueryData(canonicalKey(scope))).toMatchObject({
    receipt_cursor: 3,
  });
  expect(client.getQueryData(queryKeys.dlxBalance(scope))).toEqual({
    balance: 19,
  });
  expect(localStorage.getItem(`dalexio-tap-v2:${scope.player}`)).toBe(journal);
  expect(
    commitCanonical(
      client,
      { ...scope, player: "another" },
      canonicalSchema.parse(fixture.canonical_state),
    ),
  ).toBe(false);
  client.clear();
  localStorage.clear();
});
it("accepts Profile lifetime progression without an active Season and keeps it isolated", () => {
  const client = new QueryClient();
  const remote = remoteBootstrapSchema.parse({ ...fixture.bootstrap, season: null, canonical: { ...fixture.canonical_state, season_id: null, season_points: 0 } });
  const mapped = mapRemoteBootstrap(remote, "telegram", null, null);
  const scope = { session: 1, player: remote.canonical!.player_id, season: mapped.season.id, config: configCacheScope(remote.config) };
  const key = queryKeys.bootstrap(1, "remote", "new-user", "telegram");
  client.setQueryData(key, mapped);
  const next = canonicalSchema.parse({ ...remote.canonical, receipt_cursor: 4, progression: { ...remote.progression, lifetime_points: 280, points_into_level: 280, points_remaining: 20 } });
  expect(commitCanonical(client, scope, next)).toBe(true);
  expect(client.getQueryData(key)).toMatchObject({ player: { lifetimeXp: 280 }, remote: { season: null } });
  expect(commitCanonical(client, { ...scope, season: "other-season" }, next)).toBe(false);
  client.clear();
});
