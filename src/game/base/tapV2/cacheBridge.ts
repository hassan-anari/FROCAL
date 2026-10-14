import type { QueryClient } from "@tanstack/react-query";
import type { BootstrapPayload } from "@/game/domain/schemas";
import { configCacheScope } from "@/integrations/api/bootstrapContract";
import { queryKeys, type PlayerScope } from "@/integrations/api/queryKeys";
import type { ProfileOverview } from "@/integrations/api/profile";
import { compareSnapshots, type TapSnapshot } from "./model";
import { authorizedProgression } from "./progression";

/** Scoped commit observer. Call once per accepted receipt/snapshot, never per touch. */
export function createTapCacheBridge(client: QueryClient, scope: PlayerScope) {
  let previous: TapSnapshot | null = null;
  return (snapshot: TapSnapshot) => {
    if (snapshot.player !== scope.player || snapshot.season !== scope.season || (previous && compareSnapshots(snapshot, previous) < 0)) return;
    const matches = client.getQueryCache().findAll({ predicate: (query) => {
      const value = query.state.data as BootstrapPayload | undefined;
      return query.queryKey[0] === "bootstrap" && query.queryKey[1] === scope.session
        && value?.player.id === scope.player && value?.season.id === scope.season
        && Boolean(value.remote && value.remote.config.version === snapshot.config && configCacheScope(value.remote.config) === scope.config);
    } });
    // If auth/Season has changed, the old observer must not repopulate any removed caches.
    if (!matches.length) return;
    previous = snapshot;
    const progression = authorizedProgression(snapshot.lifetime, snapshot.progression);
    const remoteProgression = {
      lifetime_points: snapshot.lifetime, level: progression.level,
      current_threshold: snapshot.lifetime - progression.pointsIntoLevel,
      next_threshold: progression.nextThreshold, points_into_level: progression.pointsIntoLevel,
      points_remaining: progression.pointsToNextLevel, dexo_stage: progression.stage,
    };
    for (const query of matches) {
      void client.cancelQueries({ queryKey: query.queryKey, exact: true }, { revert: false });
      client.setQueryData<BootstrapPayload>(query.queryKey, (current) => current ? {
        ...current,
        player: { ...current.player, lifetimeXp: snapshot.lifetime, seasonScore: snapshot.seasonPoints,
          level: progression.level, xp: progression.pointsIntoLevel,
          xpToNextLevel: progression.levelSpan ?? Math.max(1, progression.pointsIntoLevel) },
        dexo: { ...current.dexo, level: progression.level, stage: progression.stage },
        remote: current.remote ? { ...current.remote, progression: remoteProgression,
          season: current.remote.season ? { ...current.remote.season, season_points: snapshot.seasonPoints } : null } : undefined,
      } : current);
    }
    // Update only an already-existing verified Profile cache; no request storm or creation.
    void client.cancelQueries({ queryKey: queryKeys.profileOverview(scope), exact: true }, { revert: false });
    client.setQueryData<ProfileOverview>(queryKeys.profileOverview(scope), (current) =>
      current ? { ...current, progression: remoteProgression } : current);
  };
}
