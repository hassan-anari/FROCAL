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
import { BaseHeroStats } from "@/game/base/BaseHeroStats";
import { BaseTapCooldownRing, BaseTapFeedback } from "@/game/base/BaseTapFeedback";
import { projectS1Progression } from "@/game/base/progressionContract";
import { useBaseTapExperience } from "@/game/base/useBaseTapExperience";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useBaseUiStore } from "@/game/ui/baseUiStore";
import {
  loadClanState,
  loadDailyState,
  loadMissions,
  loadRewardHistory,
  type BaseMission,
  type RewardHistoryItem,
} from "@/integrations/api/baseDashboard";
import { isRemoteDataSource, loadBootstrap } from "@/integrations/api/bootstrap";
import { loadDlxBalance } from "@/integrations/api/dlx";
import { loadProfileOverview } from "@/integrations/api/profile";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import styles from "./BasePage.module.css";

type ReactionKey = "curious" | "happy" | "focused" | "surprised" | "victory";
type ActivityTone = "cyan" | "violet" | "gold";

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

function humanize(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "now";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function missionOrder(mission: BaseMission): number {
  return mission.state === "IN_PROGRESS" ? 0 : 1;
}

function rewardActivity(item: RewardHistoryItem): {
  title: string;
  tone: ActivityTone;
  status: string;
} {
  const amount = `+${item.player_amount.toLocaleString()} XP`;
  switch (item.source_type) {
    case "BASE_TAP":
      return { title: "Base Tap rewards were added to your progress.", tone: "cyan", status: amount };
    case "DAILY":
      return { title: "Your daily reward was added to your progress.", tone: "gold", status: amount };
    case "MISSION":
      return { title: "A mission reward was added to your progress.", tone: "violet", status: amount };
    case "TYPING_CLAIM":
      return { title: "Typing Arena rewards were added to your progress.", tone: "cyan", status: amount };
    case "REFERRAL":
      return { title: "A referral reward was added to your progress.", tone: "violet", status: amount };
    case "CLAN_ACTIVITY":
    case "CLAN_MISSION":
      return { title: "Clan activity updated your progress.", tone: "violet", status: amount };
    default:
      return {
        title: `${humanize(item.source_type)} updated your progress.`,
        tone: "cyan",
        status: amount,
      };
  }
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
  const scenario = useScenarioStore((state) => state.activeScenario);
  const onboarding = useOnboardingStore();
  const promoBannerVisible = useBaseUiStore((state) => state.promoBannerVisible);
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const remoteData = isRemoteDataSource();
  const liveEnabled = remoteData && adapter.isTelegram && Boolean(initData);

  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform, initData),
  });
  const profile = useQuery({
    queryKey: queryKeys.profileOverview,
    queryFn: () => loadProfileOverview(initData),
    enabled: liveEnabled,
    staleTime: 30_000,
  });
  const dlxBalance = useQuery({
    queryKey: queryKeys.dlxBalance,
    queryFn: () => loadDlxBalance(initData),
    enabled: liveEnabled,
    staleTime: 30_000,
  });
  const missions = useQuery({
    queryKey: queryKeys.missions,
    queryFn: () => loadMissions(initData),
    enabled: liveEnabled,
    staleTime: 15_000,
  });
  const daily = useQuery({
    queryKey: queryKeys.daily,
    queryFn: () => loadDailyState(initData),
    enabled: liveEnabled,
    staleTime: 15_000,
  });
  const rewardHistory = useQuery({
    queryKey: queryKeys.rewardHistory,
    queryFn: () => loadRewardHistory(initData, 20),
    enabled: liveEnabled,
    staleTime: 15_000,
  });
  const clanState = useQuery({
    queryKey: queryKeys.clanState,
    queryFn: () => loadClanState(initData),
    enabled: liveEnabled,
    staleTime: 20_000,
  });

  const playerId = String(adapter.getUser()?.id ?? bootstrap.data?.player.id ?? "");
  const baseTap = useBaseTapExperience({
    enabled: liveEnabled,
    initData,
    playerId,
  });

  const [activeReaction, setActiveReaction] = useState<ReactionKey | null>(null);
  const [promoAssetReady, setPromoAssetReady] = useState(false);
  const [tapSequence, setTapSequence] = useState(0);
  const [previousVisitAt, setPreviousVisitAt] = useState<number | null>(null);
  const reactionCursor = useRef(0);
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (onboarding.status !== "completed") void navigate({ to: "/onboarding" });
  }, [navigate, onboarding.status]);

  useEffect(() => {
    void preloadAssets(baseReactionAssets);
  }, []);

  useEffect(() => {
    if (!playerId || typeof window === "undefined") return;
    const key = `dalexio-base-last-visit:${playerId}`;
    const previous = Number(window.localStorage.getItem(key));
    setPreviousVisitAt(Number.isFinite(previous) && previous > 0 ? previous : null);
    window.localStorage.setItem(key, String(Date.now()));
  }, [playerId]);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const serverLifetimeXp =
    profile.data?.progression.lifetime_points ?? bootstrap.data?.player.lifetimeXp ?? null;
  const displayedLifetimeXp =
    serverLifetimeXp === null ? null : serverLifetimeXp + (remoteData ? baseTap.todayPoints : 0);
  const projectedProgression =
    displayedLifetimeXp === null ? null : projectS1Progression(displayedLifetimeXp);
  const currentLevel =
    projectedProgression?.level ?? profile.data?.progression.level ?? bootstrap.data?.player.level ?? 1;
  const levelAsset = getLevelAsset(currentLevel);
  const displayedCharacter = activeReaction ? reactionLibrary[activeReaction].asset : levelAsset;
  const displayedScale = activeReaction
    ? reactionLibrary[activeReaction].scale
    : getLevelScale(currentLevel);
  const growthLabel = projectedProgression
    ? projectedProgression.levelSpan === null
      ? "MAX LEVEL"
      : `${projectedProgression.pointsIntoLevel.toLocaleString()} / ${projectedProgression.levelSpan.toLocaleString()} XP`
    : "— / — XP";
  const growthRatio = projectedProgression?.progressRatio ?? 0;

  const activeMissions = useMemo(
    () =>
      (missions.data ?? [])
        .filter((mission) => mission.state === "AVAILABLE" || mission.state === "IN_PROGRESS")
        .sort((left, right) => missionOrder(left) - missionOrder(right))
        .slice(0, 3),
    [missions.data],
  );

  const activityItems = useMemo(() => {
    const items = rewardHistory.data?.items ?? [];
    const filtered = previousVisitAt === null
      ? items
      : items.filter((item) => new Date(item.occurred_at).getTime() > previousVisitAt);
    return filtered.slice(0, 3);
  }, [previousVisitAt, rewardHistory.data?.items]);

  const displayedSeasonScore = bootstrap.data
    ? bootstrap.data.player.seasonScore + (remoteData ? baseTap.todayPoints : 0)
    : null;

  const clanStatus = useMemo(() => {
    if (currentLevel < 5) return "Locked";
    const state = clanState.data;
    if (!state) return liveEnabled ? "—" : "Open";
    if (!state.enabled || !state.eligible) return "Locked";
    if (state.cooldown_until && new Date(state.cooldown_until).getTime() > Date.now()) return "Cooldown";
    return state.role ? humanize(state.role) : "Open";
  }, [clanState.data, currentLevel, liveEnabled]);

  const scheduleReturn = () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setActiveReaction(null);
      resetTimer.current = null;
    }, 2_400);
  };

  const triggerReaction = () => {
    if (liveEnabled && !baseTap.tap()) return;

    const reaction = reactionOrder[reactionCursor.current % reactionOrder.length];
    reactionCursor.current += 1;
    setActiveReaction(reaction);
    scheduleReturn();

    if (liveEnabled) setTapSequence((sequence) => sequence + 1);
    adapter.hapticImpact(reaction === "victory" ? "medium" : "soft");
  };

  return (
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
              <div className={`${styles.promoPlaceholder} ${promoAssetReady ? styles.promoPlaceholderHidden : ""}`}>
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
            dlxReceived={dlxBalance.data?.net_confirmed ?? (dlxBalance.isLoading ? null : 0)}
          />
        </div>

        <DexoStage
          character={displayedCharacter}
          characterScale={displayedScale}
          effect="base"
          showParticles={false}
          interactive
          onPress={triggerReaction}
          onPointerPress={() => triggerReaction()}
          ariaLabel="Interact with Dexo"
          className={styles.dexoStage}
        />

        {liveEnabled ? <BaseTapFeedback tapSequence={tapSequence} /> : null}

        <div className={styles.progressFooter}>
          <div className={styles.xpLabels}>
            <span>Growth progress</span>
            <div className={styles.progressValue}>
              {liveEnabled ? (
                <BaseTapCooldownRing
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
              initial={false}
              animate={{ scaleX: growthRatio }}
              style={{ transformOrigin: "0 50%" }}
              transition={{ duration: .32, ease: mobileMotion.reveal.ease }}
            />
          </div>
        </div>
      </section>

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
          {activeMissions.map((mission, index) => (
            <article key={`${mission.key}:${mission.version}`} className={styles.objectiveItem}>
              <span className={styles.objectiveNode}>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <div className={styles.objectiveEyebrow}>
                  <span>{mission.state === "IN_PROGRESS" ? "In progress" : "Available"}</span>
                  <strong>+{mission.reward_amount.toLocaleString()} XP</strong>
                </div>
                <h3>{mission.title}</h3>
              </div>
            </article>
          ))}
          {!missions.isLoading && activeMissions.length === 0 ? (
            <div className={styles.sectionEmpty}>No available or in-progress missions right now.</div>
          ) : null}
        </div>
      </section>

      <DeferredMount minHeight={220}>
        <section className={styles.lastVisit} aria-label="Since your last visit">
          <header className={styles.sectionHeader}>
            <h2>Since Your Last Visit</h2>
          </header>
          <div className={styles.activityList}>
            {activityItems.map((item) => {
              const activity = rewardActivity(item);
              return (
                <article key={item.id} className={styles.activityItem}>
                  <i className={styles[activity.tone]} />
                  <div>
                    <strong>{activity.title}</strong>
                    <small>{relativeTime(item.occurred_at)}</small>
                  </div>
                  <span>{activity.status}</span>
                </article>
              );
            })}
            {!rewardHistory.isLoading && activityItems.length === 0 ? (
              <div className={styles.sectionEmpty}>No new reward activity since your last visit.</div>
            ) : null}
          </div>
        </section>

        <section className={styles.quickStats} aria-label="Base status">
          <div>
            <span>Daily streak</span>
            <strong>
              {daily.data
                ? `${daily.data.current_streak} day${daily.data.current_streak === 1 ? "" : "s"}`
                : "—"}
            </strong>
          </div>
          <div>
            <span>Season score</span>
            <strong>{displayedSeasonScore === null ? "—" : displayedSeasonScore.toLocaleString()}</strong>
          </div>
          <div>
            <span>Clan status</span>
            <strong>{clanStatus}</strong>
          </div>
        </section>
      </DeferredMount>
    </main>
  );
}
