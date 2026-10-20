import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import two from "./fixtures/phase4/registered-2.json";
import six from "./fixtures/phase4/registered-6.json";
import three from "./fixtures/phase4/configurable-3.json";
import missions from "./fixtures/phase4/missions.json";
import { legacyBootstrap } from "./bootstrapFixture.test-data";
import { configCacheScope, remoteBootstrapSchema } from "./bootstrapContract";
import { mapRemoteBootstrap } from "./bootstrap";
import { bootstrapServerNow, seasonAvailability } from "./seasonAvailability";
import { commitCanonical } from "./canonical";
import { queryKeys } from "./queryKeys";
import { missionSchema } from "./b3Contracts";
import { missionView } from "./useB3";

afterEach(() => vi.restoreAllMocks());
for (const fixture of [two, six, three]) {
  const timing = fixture.season.timing;
  it(`preserves pinned ${timing.product_period_days}=${timing.epoch_count}×${timing.epoch_days}+${timing.closing_days} through parsing and mapping`, () => {
    const payload = remoteBootstrapSchema.parse(fixture);
    expect(payload.season?.timing).toEqual(timing);
    const mapped = mapRemoteBootstrap(payload, "telegram", null, null);
    expect(mapped.remote?.season?.timing).toEqual(timing);
    expect(mapped.remote?.config).toEqual(payload.config);
    expect(mapped.remote?.season?.starts_at).toBe(fixture.season.starts_at);
    expect(mapped.remote?.season?.ends_at).toBe(fixture.season.ends_at);
  });
  it(`handles exact cutoffs and bounds for ${timing.product_period_days} days using server authority`, () => {
    const payload = remoteBootstrapSchema.parse({ ...fixture, gameplay: { moderation_state: "ACTIVE", reward_earning_allowed: true } });
    const cutoff = Date.parse(timing.economic_ends_at), end = Date.parse(fixture.season.ends_at), start = Date.parse(fixture.season.starts_at);
    expect(seasonAvailability(payload, start - 1).earning).toBe(false);
    expect(seasonAvailability(payload, start).earning).toBe(true);
    expect(seasonAvailability(payload, cutoff - 1).earning).toBe(true);
    expect(seasonAvailability(payload, cutoff)).toMatchObject({ status: "CLOSING", earning: false, vestedClaims: true });
    expect(seasonAvailability(payload, end - 1)).toMatchObject({ status: "CLOSING", earning: false });
    expect(seasonAvailability(payload, end)).toMatchObject({ status: "CLOSED", earning: false, vestedClaims: false });
    payload.gameplay!.reward_earning_allowed = false;
    expect(seasonAvailability(payload, cutoff - 1).earning).toBe(false);
    for (const status of ["CLOSED", "ARCHIVED"]) {
      payload.season!.status = status;
      expect(seasonAvailability(payload, cutoff - 1)).toMatchObject({ status, earning: false, vestedClaims: false });
    }
  });
}
it.each([undefined, null])("accepts legacy timing %s without substituting topology", timing => {
  const payload = remoteBootstrapSchema.parse({ ...legacyBootstrap, season: { ...legacyBootstrap.season, timing } });
  expect(payload.season?.timing).toBe(timing);
  expect(Number.isNaN(seasonAvailability(payload, Date.parse(payload.season!.starts_at)).economicEnd)).toBe(true);
});
it.each([
  {}, { epoch_days: 0 }, { epoch_count: -1 }, { closing_days: -1 }, { product_period_days: 45 },
  { epoch_count: 2.5 }, { economic_ends_at: "invalid" }, { economic_ends_at: null },
  { settlement_start_epoch: 0 }, { settlement_start_epoch: 3 }, { epoch_days: "7" },
])("rejects malformed present timing %j", change => {
  const timing = Object.keys(change).length ? { ...two.season.timing, ...change } : {};
  expect(remoteBootstrapSchema.safeParse({ ...two, season: { ...two.season, timing } }).success).toBe(false);
});
it("preserves timing, denial, config identity and clock sample across canonical updates", () => {
  const client = new QueryClient();
  const payload = remoteBootstrapSchema.parse(two);
  const mapped = mapRemoteBootstrap(payload, "telegram", null, null);
  const scope = { session: 1, player: mapped.player.id, season: mapped.season.id, config: configCacheScope(payload.config) };
  const key = queryKeys.bootstrap(1, "remote", "new-user", "telegram");
  client.setQueryData(key, mapped);
  expect(commitCanonical(client, scope, { ...payload.canonical!, receipt_cursor: 1, season_points: 20 })).toBe(true);
  expect(client.getQueryData(key)).toMatchObject({ clockReceivedAt: mapped.clockReceivedAt, remote: { season: { timing: two.season.timing }, gameplay: two.gameplay, config: payload.config } });
  expect(commitCanonical(client, { ...scope, season: "old-season" }, payload.canonical!)).toBe(false);
  client.clear();
});
it("advances the server clock monotonically despite client wall-clock offset or changes", () => {
  const clock = vi.spyOn(performance, "now").mockReturnValue(100);
  const mapped = mapRemoteBootstrap(remoteBootstrapSchema.parse(two), "telegram", null, null);
  vi.spyOn(Date, "now").mockReturnValue(0);
  clock.mockReturnValue(1100);
  expect(bootstrapServerNow(mapped)).toBe(Date.parse(two.server_time) + 1000);
});
it("supports new keys only through verified navigation semantics and preserves vested Claim state", () => {
  const views = missions.map(m => missionView(missionSchema.parse(m)));
  expect(views.map(v => [v.id, v.action, v.unavailable])).toEqual([
    ["typing-session", "typing", false], ["complete-profile", "profile", false],
    ["new-reading-key", "external", false], ["new-membership-key", "external", false],
    ["new-internal-key", "unavailable", true], ["new-unsafe-key", "unavailable", true],
  ]);
  const vested = missionView(missionSchema.parse({ ...missions[4], state: "REWARD_READY", available: false }));
  expect(vested).toMatchObject({ id: "new-internal-key", status: "completed", rewardXp: missions[4].reward_amount, unavailable: false });
});
