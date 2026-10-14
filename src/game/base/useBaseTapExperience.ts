import { useTapSession } from "./tapV2/TapSessionProvider";

/** Remote gameplay has exactly one lease controller; v1 counters never affect XP. */
export function useBaseTapExperience(input: { enabled: boolean; initData: string | null; playerId: string; serverLifetime: number }) {
  const session = useTapSession();
  const view = session?.view;
  return {
    tap: () => input.enabled && Boolean(session?.touch()),
    visualLifetime: view?.lifetime ?? input.serverLifetime,
    progression: view?.progression ?? null,
    seasonPoints: view?.seasonPoints ?? null,
    isCoolingDown: view?.isCoolingDown ?? false,
    cooldownCycle: view?.cooldownUntil ?? 0,
    cooldownMs: view?.cooldownMs ?? 0,
    cooldownRemainingMs: view?.cooldownRemainingMs ?? 0,
    cooldownUntil: view?.cooldownUntil ?? null,
  };
}
