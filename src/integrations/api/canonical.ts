import { configCacheScope } from "./bootstrapContract";
import type { QueryClient } from "@tanstack/react-query";
import type { BootstrapPayload } from "@/game/domain/schemas";
import type { ProfileOverview } from "./profile";
import { queryKeys, type PlayerScope } from "./queryKeys";
import type { CanonicalState } from "./b3Contracts";
export const canonicalKey = (scope: PlayerScope) =>
  [...queryKeys.player(scope), "canonical"] as const;
/** Commit complete, ordered server projections; never add rewards to a local balance. */
export function commitCanonical(
  client: QueryClient,
  scope: PlayerScope,
  value: CanonicalState,
) {
  if (value.player_id !== scope.player || value.season_id !== scope.season)
    return false;
  const matches = client
    .getQueryCache()
    .findAll({
      predicate: (q) =>
        q.queryKey[0] === "bootstrap" &&
        q.queryKey[1] === scope.session &&
        (q.state.data as BootstrapPayload | undefined)?.player.id ===
          scope.player &&
        (q.state.data as BootstrapPayload).season.id === scope.season &&
        Boolean(
          (q.state.data as BootstrapPayload).remote &&
            configCacheScope(
              (q.state.data as BootstrapPayload).remote!.config,
            ) === scope.config,
        ),
    });
  if (
    !matches.some(
      (q) =>
        (q.state.data as BootstrapPayload).remote?.config.version ===
        value.config_version,
    )
  )
    return false;
  const current = client.getQueryData<CanonicalState>(canonicalKey(scope));
  if (current && current.receipt_cursor > value.receipt_cursor) return false;
  client.setQueryData(canonicalKey(scope), value);
  const p = value.progression;
  for (const q of matches) {
    client.setQueryData<BootstrapPayload>(q.queryKey, (old) =>
      old
        ? {
            ...old,
            player: {
              ...old.player,
              lifetimeXp: p.lifetime_points,
              seasonScore: value.season_points,
              level: p.level,
              xp: p.points_into_level,
              xpToNextLevel:
                p.next_threshold === null
                  ? Math.max(1, p.points_into_level)
                  : p.next_threshold - p.current_threshold,
            },
            dexo: { ...old.dexo, level: p.level, stage: p.dexo_stage },
            remote: old.remote
              ? {
                  ...old.remote,
                  canonical: value,
                  progression: p,
                  season: old.remote.season
                    ? {
                        ...old.remote.season,
                        season_points: value.season_points,
                      }
                    : null,
                }
              : undefined,
          }
        : old,
    );
  }
  client.setQueryData<ProfileOverview>(
    queryKeys.profileOverview(scope),
    (old) => (old ? { ...old, canonical: value, progression: p } : old),
  );
  return true;
}
