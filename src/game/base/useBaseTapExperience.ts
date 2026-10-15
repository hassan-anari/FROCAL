import { useQuery } from "@tanstack/react-query";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { canonicalKey } from "@/integrations/api/canonical";
import type { CanonicalState } from "@/integrations/api/b3Contracts";
import { authorizedProgression } from "./tapV2/progression";
import { useTapSession } from "./tapV2/TapSessionProvider";

/** Remote gameplay has exactly one lease controller; v1 counters never affect XP. */
export function useBaseTapExperience(input: { enabled: boolean; initData: string | null; playerId: string; serverLifetime: number }) {
  const session = useTapSession();
  const view = session?.view;
  const { scope } = useBootstrap();
  const canonical = useQuery<CanonicalState>({ queryKey: canonicalKey(scope), enabled: false }).data;
  const newer = canonical && canonical.receipt_cursor > (view?.committed?.receiptCursor ?? -1);
  const canonicalProgression = newer && view?.committed ? authorizedProgression(canonical.progression.lifetime_points, view.committed.progression) : null;
  return {
    tap: () => input.enabled && Boolean(session?.touch()),
    visualLifetime: newer ? canonical.progression.lifetime_points : view?.lifetime ?? input.serverLifetime,
    progression: canonicalProgression ?? view?.progression ?? null,
    seasonPoints: newer ? canonical.season_points : view?.seasonPoints ?? null,
    isCoolingDown: view?.isCoolingDown ?? false,
    cooldownCycle: view?.cooldownUntil ?? 0,
    cooldownMs: view?.cooldownMs ?? 0,
    cooldownRemainingMs: view?.cooldownRemainingMs ?? 0,
    cooldownUntil: view?.cooldownUntil ?? null,
  };
}
