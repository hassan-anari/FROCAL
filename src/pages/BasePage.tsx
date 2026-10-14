import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { getAssetPath } from "@/assets/registry";
import type { AssetKey } from "@/assets/registry";
import { DexoStage } from "@/design-system/components/DexoStage";
import { DeferredMount } from "@/design-system/performance/DeferredMount";
import { Button } from "@/design-system/primitives/Button";
import { BaseHeroStats } from "@/game/base/BaseHeroStats";
import { BaseTapCooldownIndicator } from "@/game/base/BaseTapCooldownIndicator";
import { BaseTapFeedback } from "@/game/base/BaseTapFeedback";
import { useBaseTapExperience } from "@/game/base/useBaseTapExperience";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { progressionForLifetime } from "@/game/progression/s1Progression";
import { useEarnStore } from "@/game/earn/earnStore";
import { useBaseUiStore } from "@/game/ui/baseUiStore";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import { loadDlxBalance } from "@/integrations/api/dlx";
import { useProfileOverview } from "@/integrations/api/useProfileOverview";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import styles from "./BasePage.module.css";

type ReactionKey = "curious" | "happy" | "focused" | "surprised" | "victory";

const reactionLibrary: Record<ReactionKey, { asset: AssetKey; scale: number }> = {
  curious: { asset: "dexo.personalityCurious", scale: 1.05 },
  happy: { asset: "dexo.personalityHappy", scale: 1.02 },
  focused: { asset: "dexo.personalityFocused", scale: 1.05 },
  surprised: { asset: "dexo.personalitySurprised", scale: 1.03 },
  victory: { asset: "dexo.personalityVictory", scale: 1.02 },
};

const reactionOrder: ReactionKey[] = ["curious", "happy", "focused", "surprised", "victory"];

const activityFeed = [
  { id: "missions", tone: "cyan", title: "12 completed missions updated your progress.", time: "2m ago", status: "Ready" },
  { id: "clan-xp", tone: "violet", title: "NovaGuard gained 340 Clan XP.", time: "18m ago", status: "Synced" },
  { id: "fragment", tone: "gold", title: "A Rare Season Fragment is now available.", time: "1h ago", status: "New" },
] as const;

function getLevelAsset(level: number): AssetKey {
  if (level >= 30) return "dexo.level30";
  if (level >= 20) return "dexo.level20";
  if (level >= 15) return "dexo.level15";
  if (level >= 10) return "dexo.level10";
  if (level >= 5) return "dexo.level05";
  return "dexo.level01";
}

function getLevelScale(level: number): number {
  if (level >= 30) return 1;
  if (level >= 20) return 1.02;
  if (level >= 15) return 1.04;
  if (level >= 10) return 1.06;
  if (level >= 5) return 1.09;
  return 1.14;
}

function getDexoTitle(level: number): string {
  if (level >= 30) return "Legend Companion";
  if (level >= 20) return "Vanguard Companion";
  if (level >= 15) return "Specialist Companion";
  if (level >= 10) return "Connector Companion";
  if (level >= 5) return "Explorer Companion";
  return "Newborn Companion";
}

const baseReactionAssets = [
  "dexo.platform",
  "dexo.level01",
  "dexo.level05",
  "dexo.level10",
  "dexo.level15",
  "dexo.level20",
  "dexo.level30",
  "dexo.personalityCurious",
  "dexo.personalityHappy",
  "dexo.personalityFocused",
  "dexo.personalitySurprised",
  "dexo.personalityVictory",
] as const;

export function BasePage() {
  const navigate = useNavigate();
  const onboarding = useOnboardingStore();
  const criticalActionVisible = useBaseUiStore((state) => state.criticalActionVisible);
  const promoBannerVisible = useBaseUiStore((state) => state.promoBannerVisible);
  const earnLevel = useEarnStore((state) => state.level);
  const earnLevelXp = useEarnStore((state) => state.levelXp);
  const earnLevelTarget = useEarnStore((state) => state.xpToNextLevel);
  const lifetimeXp = useEarnStore((state) => state.lifetimeXp);
  const streak = useEarnStore((state) => state.streak);
  const missions = useEarnStore((state) => state.missions);
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const remoteData = isRemoteDataSource();

  const { bootstrap, scope } = useBootstrap();

  const profile = useProfileOverview();

  const dlxBalance = useQuery({
    queryKey: queryKeys.dlxBalance(scope),
    queryFn: () => loadDlxBalance(initData),
    enabled: remoteData && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified",
    staleTime: 30_000,
  });

  const [activeReaction, setActiveReaction] = useState<ReactionKey | null>(null);
  const [promoAssetReady, setPromoAssetReady] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const reactionCursor = useRef(0);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (onboarding.status !== "completed") void navigate({ to: "/onboarding" });
  }, [navigate, onboarding.status]);

  useEffect(() => {
    void preloadAssets(baseReactionAssets);
  }, []);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const telegramFirstName = adapter.getUser()?.first_name ?? "Explorer";
  const bootstrapPlayer = bootstrap.data?.player ?? null;
  const phase2Player = bootstrapPlayer ?? {
    id: "pending-player",
    firstName: telegramFirstName,
    displayName: telegramFirstName,
    telegramUsername: null,
    avatarUrl: null,
    level: 1,
    xp: 0,
    xpToNextLevel: 1,
    lifetimeXp: 0,
    seasonScore: 0,
    clanId: null,
  };
  const playerId = bootstrapPlayer?.id ?? "pending-player";
  const serverLifetime =
    bootstrapPlayer?.lifetimeXp ?? profile.data?.progression.lifetime_points ?? null;

  const baseTap = useBaseTapExperience({
    enabled: remoteData && adapter.isTelegram && serverLifetime !== null,
    initData,
    playerId,
    serverLifetime: serverLifetime ?? 0,
  });

  const displayedLifetimeXp = remoteData
    ? serverLifetime === null
      ? null
      : baseTap.visualLifetime
    : lifetimeXp;
  const liveProgression =
    remoteData && displayedLifetimeXp !== null && displayedLifetimeXp !== serverLifetime
      ? progressionForLifetime(displayedLifetimeXp)
      : null;
  const currentLevel = remoteData
    ? liveProgression?.level ?? bootstrapPlayer?.level ?? profile.data?.progression.level ?? 1
    : Math.max(phase2Player.level, earnLevel);
  const currentLevelXp = remoteData
    ? liveProgression?.pointsIntoLevel ?? bootstrapPlayer?.xp ?? null
    : currentLevel === earnLevel
      ? earnLevelXp
      : phase2Player.xp;
  const currentLevelTarget = remoteData
    ? liveProgression?.levelSpan ?? bootstrapPlayer?.xpToNextLevel ?? null
    : currentLevel === earnLevel
      ? earnLevelTarget
      : phase2Player.xpToNextLevel;
  const xpPercent = useMemo(() => {
    if (remoteData) {
      if (liveProgression?.nextThreshold === null && liveProgression) return 100;
      if (currentLevelXp === null || currentLevelTarget === null || currentLevelTarget <= 0) return 0;
      return Math.min(100, Math.round((currentLevelXp / currentLevelTarget) * 100));
    }
    return Math.min(100, Math.round(((currentLevelXp ?? 0) / Math.max(currentLevelTarget ?? 1, 1)) * 100));
  }, [currentLevelTarget, currentLevelXp, liveProgression, remoteData]);
  const stageAssets: Record<string, AssetKey> = { newborn: "dexo.level01", explorer: "dexo.level05", connector: "dexo.level10", specialist: "dexo.level15", vanguard: "dexo.level20", legend: "dexo.level30" };
  const levelAsset = remoteData && !liveProgression && bootstrap.data
    ? stageAssets[bootstrap.data.dexo.stage] ?? getLevelAsset(currentLevel)
    : getLevelAsset(currentLevel);
  const displayedCharacter = activeReaction ? reactionLibrary[activeReaction].asset : levelAsset;
  const displayedScale = activeReaction
    ? reactionLibrary[activeReaction].scale
    : getLevelScale(currentLevel);
  const missionList = Object.values(missions);
  const claimedMissionCount = missionList.filter((mission) => mission.status === "claimed").length;
  const starterProgress = Math.round((claimedMissionCount / missionList.length) * 100);
  const currentMission = missionList.find((mission) => mission.status !== "claimed");
  const currentMissionProgress =
    currentMission?.status === "completed" ? 90 : currentMission?.status === "in-progress" ? 45 : 0;

  const growthLabel = remoteData
    ? liveProgression?.nextThreshold === null && liveProgression
      ? "MAX LEVEL"
      : currentLevelXp === null || currentLevelTarget === null
        ? "— / — XP"
        : `${currentLevelXp.toLocaleString()} / ${currentLevelTarget.toLocaleString()} XP`
    : `${(currentLevelXp ?? 0).toLocaleString()} / ${(currentLevelTarget ?? 1).toLocaleString()} XP`;

  const scheduleReturn = () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setActiveReaction(null);
      resetTimer.current = null;
    }, 2_400);
  };

  const triggerReaction = () => {
    if (remoteData && adapter.isTelegram && !baseTap.tap()) return;

    const reaction = reactionOrder[reactionCursor.current % reactionOrder.length];
    reactionCursor.current += 1;
    setActiveReaction(reaction);
    scheduleReturn();

    if (remoteData && adapter.isTelegram) {
      setTapCount((count) => count + 1);
    }

    adapter.hapticImpact(reaction === "victory" ? "medium" : "soft");
  };

  return (
    <>
      <main className={styles.page}>
        <AnimatePresence initial={false}>
          {promoBannerVisible ? (
            <motion.aside
              className={styles.promoSlot}
              initial={{ opacity: 0, y: -7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={mobileMotion.reveal}
              aria-label="Promotional banner placement"
            >
              <div className={styles.promoBanner}>
                <div
                  className={`${styles.promoPlaceholder} ${promoAssetReady ? styles.promoPlaceholderHidden : ""}`}
                >
                  <span>Optional promotion</span>
                  <strong>BASE PROMO BANNER</strong>
                  <small>1200 × 260 WEBP</small>
                </div>
                <img
                  className={`${styles.promoImage} ${promoAssetReady ? styles.promoImageReady : ""}`}
                  src={getAssetPath("base.promoBanner")}
                  alt="Dalexio Base promotional banner"
                  onLoad={() => setPromoAssetReady(true)}
                  onError={() => setPromoAssetReady(false)}
                />
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        <section className={styles.hero} aria-label="Personal Dexo base">
          <div className={styles.dexoMeta}>
            <div>
              <span>YOUR DEXO</span>
              <strong>{getDexoTitle(currentLevel)}</strong>
            </div>
            <BaseHeroStats
              lifetimeXp={displayedLifetimeXp}
              dlxReceived={remoteData ? dlxBalance.data?.net_confirmed ?? null : 0}
            />
          </div>

          <DexoStage
            character={displayedCharacter}
            characterScale={displayedScale}
            effect="base"
            showParticles={false}
            interactive
            multiTouch={remoteData && adapter.isTelegram}
            onPress={triggerReaction}
            ariaLabel="Interact with Dexo"
            className={styles.dexoStage}
          />

          {remoteData && adapter.isTelegram ? <BaseTapFeedback tapCount={tapCount} /> : null}

          <div className={styles.progressFooter}>
            <div className={styles.xpLabels}>
              <span>Growth progress</span>
              <div className={styles.progressValue}>
                {remoteData && adapter.isTelegram ? (
                  <BaseTapCooldownIndicator
                    cooldownCycle={baseTap.cooldownCycle}
                    cooldownMs={baseTap.cooldownMs}
                    isCoolingDown={baseTap.isCoolingDown}
                  />
                ) : null}
                <strong>{growthLabel}</strong>
              </div>
            </div>
            <div className={styles.xpTrack}>
              <motion.i
                initial={{ scaleX: 0 }}
                animate={{ scaleX: xpPercent / 100 }}
                style={{ transformOrigin: "0 50%" }}
                transition={{ duration: .48, ease: mobileMotion.reveal.ease }}
              />
            </div>
          </div>
        </section>

        <AnimatePresence initial={false}>
          {criticalActionVisible ? (
            <motion.section
              className={styles.criticalAction}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={mobileMotion.reveal}
            >
              <div className={styles.criticalHeader}>
                <span>Next critical action</span>
                <small>War in 42m</small>
              </div>
              <h2>Defend your clan outpost</h2>
              <p>
                KRYPT-9 is probing the eastern relay. Join the preparation phase before deployment
                locks.
              </p>
              <Button
                size="lg"
                className={styles.criticalButton}
                trailingIcon={
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />
                }
                onClick={() =>
                  startTransition(() => {
                    void navigate({ to: "/arena" });
                  })
                }
              >
                Join clan defence
              </Button>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <section className={styles.objectives} aria-label="Next objectives">
          <header className={styles.sectionHeader}>
            <h2>Next Objective</h2>
            <button
              type="button"
              onClick={() =>
                startTransition(() => {
                  void navigate({ to: "/earn" });
                })
              }
            >
              All missions <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.7} />
            </button>
          </header>

          <div className={styles.objectiveTimeline}>
            <article className={`${styles.objectiveItem} ${styles.objectiveActive}`}>
              <span className={styles.objectiveNode}>01</span>
              <div>
                <div className={styles.objectiveEyebrow}>
                  <span>Current objective</span>
                  <strong>{currentMission ? `${currentMissionProgress}%` : "100%"}</strong>
                </div>
                <h3>
                  {currentMission
                    ? currentMission.status === "completed"
                      ? `Claim ${currentMission.title}`
                      : currentMission.title
                    : "Starter Protocol complete"}
                </h3>
                <div className={styles.objectiveTrack}>
                  <i style={{ width: `${currentMission ? currentMissionProgress : 100}%` }} />
                </div>
              </div>
            </article>
            <article className={styles.objectiveItem}>
              <span className={styles.objectiveNode}>02</span>
              <div>
                <div className={styles.objectiveEyebrow}>
                  <span>Starter pathway</span>
                  <strong>{starterProgress}%</strong>
                </div>
                <h3>{claimedMissionCount < 2 ? "Accuracy Protocol" : "Season Access"}</h3>
              </div>
            </article>
            <article className={styles.objectiveItem}>
              <span className={styles.objectiveNode}>03</span>
              <div>
                <div className={styles.objectiveEyebrow}>
                  <span>Milestone</span>
                  <strong>→</strong>
                </div>
                <h3>Operator Medal · Tier II</h3>
              </div>
            </article>
          </div>
        </section>

        <DeferredMount minHeight={220}>
          <section className={styles.lastVisit} aria-label="Since your last visit">
            <header className={styles.sectionHeader}>
              <h2>Since Your Last Visit</h2>
            </header>
            <div className={styles.activityList}>
              {activityFeed.map((item) => (
                <article key={item.id} className={styles.activityItem}>
                  <i className={styles[item.tone]} />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.time}</small>
                  </div>
                  <span>{item.status}</span>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.quickStats} aria-label="Base status">
            <div>
              <span>Daily streak</span>
              <strong>
                {streak || 0} day{streak === 1 ? "" : "s"}
              </strong>
            </div>
            <div>
              <span>Season score</span>
              <strong>{phase2Player.seasonScore}</strong>
            </div>
            <div>
              <span>Clan status</span>
              <strong>Open</strong>
            </div>
          </section>
        </DeferredMount>
      </main>
    </>
  );
}
