import { baseObjectives, missionStateLabel } from "@/integrations/api/baseObjectives";
import { useQueryFeedback } from "@/design-system/components/TransientFeedback";
import { useRewardHistory } from "@/integrations/api/useRewardHistory";
import { rewardHistoryView, formatXp, rewardTimestamp } from "@/integrations/api/rewardHistory";
import { BasePromoBanner } from "@/design-system/components/BasePromoBanner";
import { useB3 } from "@/integrations/api/useB3";
import { useGameplayAvailability } from "@/integrations/api/useGameplayAvailability";
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
  const promoBannerVisible = useBaseUiStore((state) => state.promoBannerVisible);
  const earnLevel = useEarnStore((state) => state.level);
  const earnLevelXp = useEarnStore((state) => state.levelXp);
  const earnLevelTarget = useEarnStore((state) => state.xpToNextLevel);
  const lifetimeXp = useEarnStore((state) => state.lifetimeXp);
  const localStreak = useEarnStore((state) => state.streak);
  const live = useB3();
  const streak = live.remote ? live.daily.data?.current_streak ?? 0 : localStreak;
  const localMissions = useEarnStore((state) => state.missions);
  useQueryFeedback(live.remote ? live.missions.error : null, "Objectives couldn't load. Please try again.");
  const history = useRewardHistory();
  const recentRewards = history.items.filter(item => item.player_amount !== 0).slice(0, 3).map(rewardHistoryView);
  const objectives = live.remote ? baseObjectives(live.missions.data).map(m => ({ id: m.key, title: m.title, rewardXp: m.reward_amount, label: missionStateLabel(m.state) })) : Object.values(localMissions).filter(m => m.status !== "claimed").slice(0, 3).map(m => ({ ...m, label: m.status === "completed" ? "Reward ready" : m.status === "in-progress" ? "In progress" : "Available" }));
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const remoteData = isRemoteDataSource();
  const { canEarn } = useGameplayAvailability();
  const tapAvailable = canEarn("base_tap");

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
    enabled: remoteData && adapter.isTelegram && serverLifetime !== null && tapAvailable,
    initData,
    playerId,
    serverLifetime: serverLifetime ?? 0,
  });

  const displayedLifetimeXp = remoteData
    ? serverLifetime === null
      ? null
      : baseTap.visualLifetime
    : lifetimeXp;
  const liveProgression = remoteData ? baseTap.progression : null;
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
  // Artwork sizing/titles are approved presentation, selected by the authorized stage.
  const stagePresentation: Record<string, number> = { newborn: 1, explorer: 5, connector: 10, specialist: 15, vanguard: 20, legend: 30 };
  const presentationLevel = remoteData ? stagePresentation[liveProgression?.stage ?? bootstrap.data?.dexo.stage ?? "newborn"] : currentLevel;
  const levelAsset = remoteData
    ? stageAssets[liveProgression?.stage ?? bootstrap.data?.dexo.stage ?? "newborn"] ?? getLevelAsset(currentLevel)
    : getLevelAsset(currentLevel);
  const displayedCharacter = activeReaction ? reactionLibrary[activeReaction].asset : levelAsset;
  const displayedScale = activeReaction
    ? reactionLibrary[activeReaction].scale
    : getLevelScale(presentationLevel);
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
    if (remoteData && !canEarn("base_tap")) return;
    if (remoteData && adapter.isTelegram && tapAvailable && !baseTap.tap()) return;

    const reaction = reactionOrder[reactionCursor.current % reactionOrder.length];
    reactionCursor.current += 1;
    setActiveReaction(reaction);
    scheduleReturn();

    if (remoteData && adapter.isTelegram && tapAvailable) {
      setTapCount((count) => count + 1);
    }

    adapter.hapticImpact(reaction === "victory" ? "medium" : "soft");
  };

  return (
    <>
      <main className={styles.page}>
        {remoteData ? <BasePromoBanner /> : null}
        <AnimatePresence initial={false}>
          {import.meta.env.DEV && !remoteData && promoBannerVisible ? (
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
              <strong>{getDexoTitle(presentationLevel)}</strong>
            </div>
            <BaseHeroStats
              lifetimeXp={displayedLifetimeXp}
              dlxReceived={remoteData ? dlxBalance.data?.net_confirmed ?? null : 0}
            />
          </div>

          <DexoStage
            character={displayedCharacter}
            characterScale={displayedScale}
            baseCharacter={levelAsset}
            baseCharacterScale={getLevelScale(presentationLevel)}
            effect="base"
            showParticles={false}
            interactive
            disabled={remoteData && !tapAvailable}
            multiTouch={remoteData && adapter.isTelegram}
            onPress={triggerReaction}
            ariaLabel="Interact with Dexo"
            className={styles.dexoStage}
          />

          {remoteData && adapter.isTelegram ? <BaseTapFeedback tapCount={tapCount} /> : null}

          <div className={styles.progressFooter}>
            {remoteData && !tapAvailable && baseTap.unresolvedEvents > 0 ? <span role="status">Saved taps are awaiting server confirmation.</span> : null}
            <div className={styles.xpLabels}>
              <span>Growth progress</span>
              <div className={styles.progressValue}>
                {remoteData && adapter.isTelegram ? (
                  <BaseTapCooldownIndicator
                    cooldownCycle={baseTap.cooldownCycle}
                    cooldownMs={baseTap.cooldownMs}
                    remainingMs={baseTap.cooldownRemainingMs}
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


        {objectives.length > 0 ? <section className={styles.objectives} aria-label="Next objectives">
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
            {objectives.map((mission, index) => (
              <article key={mission.id} className={styles.objectiveItem}>
                <span className={styles.objectiveNode}>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className={styles.objectiveEyebrow}>
                    <span>{mission.label}</span>
                    <strong>{mission.rewardXp} XP</strong>
                  </div>
                  <h3>{mission.title}</h3>
                </div>
              </article>
            ))}
          </div>
        </section> : null}

        <DeferredMount minHeight={220}>
          {recentRewards.length > 0 ? <section className={styles.lastVisit} aria-label="Recent rewards">
            <header className={styles.sectionHeader}>
              <h2>Recent Rewards</h2>
            </header>
            <div className={styles.activityList}>
              {recentRewards.map((item, index) => (
                <article key={item.id} className={styles.activityItem}>
                  <i className={styles[(["cyan", "violet", "gold"] as const)[index]]} />
                  <div>
                    <strong>{item.title}{item.description ? ` · ${item.description}` : ""}</strong>
                    <small>{rewardTimestamp(item.createdAt)}</small>
                  </div>
                  <span>{formatXp(item.xp!)}</span>
                </article>
              ))}
            </div>
          </section> : null}

          <section className={styles.quickStats} aria-label="Base status">
            <div>
              <span>Daily streak</span>
              <strong>
                {streak || 0} day{streak === 1 ? "" : "s"}
              </strong>
            </div>
            <div>
              <span>Season score</span>
              <strong>{remoteData ? baseTap.seasonPoints ?? phase2Player.seasonScore : phase2Player.seasonScore}</strong>
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
