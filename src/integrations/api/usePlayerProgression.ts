import { useEarnStore } from "@/game/earn/earnStore";
import { isRemoteDataSource } from "./bootstrap";
import { useBootstrap } from "./BootstrapProvider";
import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";
/** Local progression is only a development scenario; authenticated views use Bootstrap. */
export function usePlayerProgression() {
  const { bootstrap } = useBootstrap();
  const local = useEarnStore();
  const player = bootstrap.data?.player;
  const tap = useTapSession()?.view;
  return isRemoteDataSource() ? {
    level: tap?.progression?.level ?? player?.level ?? 1,
    levelXp: tap?.progression?.pointsIntoLevel ?? player?.xp ?? 0,
    xpToNextLevel: tap?.progression?.levelSpan ?? player?.xpToNextLevel ?? 1,
    lifetimeXp: tap?.lifetime ?? player?.lifetimeXp ?? 0,
  } : { level: local.level, levelXp: local.levelXp, xpToNextLevel: local.xpToNextLevel, lifetimeXp: local.lifetimeXp };
}
