import { useQuery } from "@tanstack/react-query";
import { canonicalKey } from "./canonical";
import type { CanonicalState } from "./b3Contracts";
import { useEarnStore } from "@/game/earn/earnStore";
import { isRemoteDataSource } from "./bootstrap";
import { useBootstrap } from "./BootstrapProvider";
import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";
/** Local progression is only a development scenario; authenticated views use Bootstrap. */
export function usePlayerProgression() {
  const { bootstrap, scope } = useBootstrap();
  const canonical = useQuery<CanonicalState>({ queryKey: canonicalKey(scope), enabled: false }).data;
  const local = useEarnStore();
  const player = bootstrap.data?.player;
  const tap = useTapSession()?.view;
  if (isRemoteDataSource() && canonical && canonical.receipt_cursor > (tap?.committed?.receiptCursor ?? -1)) {
    const p = canonical.progression;
    return { stage: p.dexo_stage, level: p.level, levelXp: p.points_into_level, xpToNextLevel: p.next_threshold === null ? Math.max(1,p.points_into_level) : p.next_threshold - p.current_threshold, lifetimeXp: p.lifetime_points };
  }
  return isRemoteDataSource() ? {
    stage: tap?.progression?.stage ?? bootstrap.data?.dexo.stage ?? "newborn",
    level: tap?.progression?.level ?? player?.level ?? 1,
    levelXp: tap?.progression?.pointsIntoLevel ?? player?.xp ?? 0,
    xpToNextLevel: tap?.progression?.levelSpan ?? player?.xpToNextLevel ?? 1,
    lifetimeXp: tap?.lifetime ?? player?.lifetimeXp ?? 0,
  } : { stage: bootstrap.data?.dexo.stage ?? "newborn", level: local.level, levelXp: local.levelXp, xpToNextLevel: local.xpToNextLevel, lifetimeXp: local.lifetimeXp };
}
