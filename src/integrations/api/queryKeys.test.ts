import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
it("isolates player, credential session, Season, and config caches without storing credentials", () => {
  const client = new QueryClient();
  const scope = { session: 1, player: "1", season: "s1", config: "v1" };
  client.setQueryData(queryKeys.profileOverview(scope), { lifetime_points: 100 });
  for (const changed of [{ player: "2" }, { session: 2 }, { season: "s2" }, { config: "v2" }]) {
    expect(client.getQueryData(queryKeys.profileOverview({ ...scope, ...changed }))).toBeUndefined();
  }
  expect(client.getQueryData(queryKeys.profileOverview(scope))).toEqual({ lifetime_points: 100 });
  expect(queryKeys.bootstrap(1, "remote", "new-user", "telegram")).not.toContain("raw-init-data");
});
