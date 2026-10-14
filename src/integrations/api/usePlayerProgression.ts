import { useEarnStore } from "@/game/earn/earnStore";
import { isRemoteDataSource } from "./bootstrap";
import { useBootstrap } from "./BootstrapProvider";
/** Local progression is only a development scenario; authenticated views use Bootstrap. */
export function usePlayerProgression() {
  const { bootstrap } = useBootstrap();
  const local = useEarnStore();
  const player = bootstrap.data?.player;
  return isRemoteDataSource() ? {
    level: player?.level ?? 1,
    levelXp: player?.xp ?? 0,
    xpToNextLevel: player?.xpToNextLevel ?? 1,
    lifetimeXp: player?.lifetimeXp ?? 0,
  } : { level: local.level, levelXp: local.levelXp, xpToNextLevel: local.xpToNextLevel, lifetimeXp: local.lifetimeXp };
}
