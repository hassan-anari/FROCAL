import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { getAssetPath } from "@/assets/registry";
import type { AssetKey } from "@/assets/registry";
import { DexoStage } from "@/design-system/components/DexoStage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { Button } from "@/design-system/primitives/Button";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useEarnStore } from "@/game/earn/earnStore";
import { useBaseUiStore } from "@/game/ui/baseUiStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./BasePage.module.css";

type ReactionKey = "curious" | "happy" | "focused" | "surprised" | "victory";

const reactionLibrary: Record<ReactionKey, { asset: AssetKey; scale: number; dialogues: string[] }> = {
  curious: { asset: "dexo.personalityCurious", scale: 1.05, dialogues: ["What are we discovering next?", "I found a new path worth exploring.", "Something new is waiting out there.", "Let’s take a closer look together."] },
  happy: { asset: "dexo.personalityHappy", scale: 1.02, dialogues: ["I’m glad you’re here.", "Base feels brighter with you around.", "That made my core glow.", "Ready for another good moment?"] },
  focused: { asset: "dexo.personalityFocused", scale: 1.05, dialogues: ["Systems aligned. I’m ready.", "One clear objective at a time.", "Focus locked. Let’s move.", "I’m tracking our next best step."] },
  surprised: { asset: "dexo.personalitySurprised", scale: 1.03, dialogues: ["Whoa — I didn’t expect that!", "Did you see that energy spike?", "Okay, that definitely got my attention.", "A new discovery just appeared!"] },
  victory: { asset: "dexo.personalityVictory", scale: 1.02, dialogues: ["That’s the spirit — victory starts here!", "We’re building momentum already.", "Another step toward our legacy.", "I knew we could make that count."] },
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

const baseReactionAssets = ["dexo.platform", "dexo.level01", "dexo.level05", "dexo.level10", "dexo.level15", "dexo.level20", "dexo.level30", "dexo.personalityCurious", "dexo.personalityHappy", "dexo.personalityFocused", "dexo.personalitySurprised", "dexo.personalityVictory"] as const;

export function BasePage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
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
  const bootstrap = useQuery({ queryKey: queryKeys.bootstrap(scenario), queryFn: () => loadBootstrap(scenario, adapter.platform) });
  const [activeReaction, setActiveReaction] = useState<ReactionKey | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [typedDialogue, setTypedDialogue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [promoAssetReady, setPromoAssetReady] = useState(false);
  const reactionCursor = useRef(0);
  const dialogueCursor = useRef<Record<ReactionKey, number>>({ curious: 0, happy: 0, focused: 0, surprised: 0, victory: 0 });
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (onboarding.status !== "completed") void navigate({ to: "/onboarding" });
  }, [navigate, onboarding.status]);

  useEffect(() => { void preloadAssets(baseReactionAssets); }, []);

  useEffect(() => {
    if (!dialogue) { setTypedDialogue(""); setIsTyping(false); return; }
    let cursor = 0;
    setTypedDialogue("");
    setIsTyping(true);
    const timer = window.setInterval(() => {
      cursor += 1;
      setTypedDialogue(dialogue.slice(0, cursor));
      if (cursor >= dialogue.length) { window.clearInterval(timer); setIsTyping(false); }
    }, 24);
    return () => window.clearInterval(timer);
  }, [dialogue]);


  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const telegramFirstName = adapter.getUser()?.first_name ?? "Explorer";
  const player = bootstrap.data?.player ?? { id: "pending-player", firstName: telegramFirstName, displayName: telegramFirstName, telegramUsername: null, avatarUrl: null, level: 1, xp: 120, xpToNextLevel: 500, seasonScore: 0, clanId: null };
  const currentLevel = Math.max(player.level, earnLevel);
  const currentLevelXp = currentLevel === earnLevel ? earnLevelXp : player.xp;
  const currentLevelTarget = currentLevel === earnLevel ? earnLevelTarget : player.xpToNextLevel;
  const xpPercent = useMemo(() => Math.min(100, Math.round((currentLevelXp / currentLevelTarget) * 100)), [currentLevelTarget, currentLevelXp]);
  const levelAsset = getLevelAsset(currentLevel);
  const displayedCharacter = activeReaction ? reactionLibrary[activeReaction].asset : levelAsset;
  const displayedScale = activeReaction ? reactionLibrary[activeReaction].scale : getLevelScale(currentLevel);
  const missionList = Object.values(missions);
  const claimedMissionCount = missionList.filter((mission) => mission.status === "claimed").length;
  const starterProgress = Math.round((claimedMissionCount / missionList.length) * 100);
  const currentMission = missionList.find((mission) => mission.status !== "claimed");
  const currentMissionProgress = currentMission?.status === "completed" ? 90 : currentMission?.status === "in-progress" ? 45 : 0;

  const scheduleReturn = () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => { setActiveReaction(null); setDialogue(null); resetTimer.current = null; }, 10_000);
  };

  const triggerReaction = () => {
    const reaction = reactionOrder[reactionCursor.current % reactionOrder.length];
    reactionCursor.current += 1;
    const entry = reactionLibrary[reaction];
    const index = dialogueCursor.current[reaction] % entry.dialogues.length;
    dialogueCursor.current[reaction] += 1;
    setActiveReaction(reaction);
    setDialogue(entry.dialogues[index]);
    scheduleReturn();
    adapter.hapticImpact(reaction === "victory" ? "medium" : "soft");
  };

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />

        <AnimatePresence initial={false}>
          {promoBannerVisible ? (
            <motion.aside
              className={styles.promoSlot}
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: .3, ease: [0.22, 1, 0.36, 1] }}
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
            <div className={styles.totalXpDisplay} aria-label={`${lifetimeXp.toLocaleString()} total XP`}>
              <span>Lifetime XP</span>
              <div>
                <strong>{lifetimeXp.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {dialogue ? (
              <motion.div key={dialogue} className={styles.reaction} initial={{ opacity: 0, y: 8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }} role="status" aria-live="polite">
                <span className={styles.speaker}>DEXO</span>
                <span className={styles.dialogueText}>{typedDialogue}{isTyping ? <i className={styles.typingCursor} /> : null}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <DexoStage character={displayedCharacter} characterScale={displayedScale} effect="base" showParticles={false} interactive onPress={triggerReaction} ariaLabel="Interact with Dexo" className={styles.dexoStage} />

          <div className={styles.progressFooter}>
            <div className={styles.xpLabels}><span>Growth progress</span><strong>{currentLevelXp} / {currentLevelTarget} XP</strong></div>
            <div className={styles.xpTrack}><motion.i initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: .85 }} /></div>
          </div>
        </section>

        <AnimatePresence initial={false}>
          {criticalActionVisible ? (
            <motion.section className={styles.criticalAction} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: .32 }}>
              <div className={styles.criticalHeader}>
                <span>Next critical action</span>
                <small>War in 42m</small>
              </div>
              <h2>Defend your clan outpost</h2>
              <p>KRYPT-9 is probing the eastern relay. Join the preparation phase before deployment locks.</p>
              <Button size="lg" className={styles.criticalButton} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={() => void navigate({ to: "/arena" })}>
                Join clan defence
              </Button>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <section className={styles.objectives} aria-label="Next objectives">
          <header className={styles.sectionHeader}>
            <h2>Next Objective</h2>
            <button type="button" onClick={() => void navigate({ to: "/earn" })}>All missions <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.7} /></button>
          </header>

          <div className={styles.objectiveTimeline}>
            <article className={`${styles.objectiveItem} ${styles.objectiveActive}`}>
              <span className={styles.objectiveNode}>01</span>
              <div>
                <div className={styles.objectiveEyebrow}><span>Current objective</span><strong>{currentMission ? `${currentMissionProgress}%` : "100%"}</strong></div>
                <h3>{currentMission ? (currentMission.status === "completed" ? `Claim ${currentMission.title}` : currentMission.title) : "Starter Protocol complete"}</h3>
                <div className={styles.objectiveTrack}><i style={{ width: `${currentMission ? currentMissionProgress : 100}%` }} /></div>
              </div>
            </article>
            <article className={styles.objectiveItem}>
              <span className={styles.objectiveNode}>02</span>
              <div>
                <div className={styles.objectiveEyebrow}><span>Starter pathway</span><strong>{starterProgress}%</strong></div>
                <h3>{claimedMissionCount < 2 ? "Accuracy Protocol" : "Season Access"}</h3>
              </div>
            </article>
            <article className={styles.objectiveItem}>
              <span className={styles.objectiveNode}>03</span>
              <div>
                <div className={styles.objectiveEyebrow}><span>Milestone</span><strong>→</strong></div>
                <h3>Operator Medal · Tier II</h3>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.lastVisit} aria-label="Since your last visit">
          <header className={styles.sectionHeader}><h2>Since Your Last Visit</h2></header>
          <div className={styles.activityList}>
            {activityFeed.map((item) => (
              <article key={item.id} className={styles.activityItem}>
                <i className={styles[item.tone]} />
                <div><strong>{item.title}</strong><small>{item.time}</small></div>
                <span>{item.status}</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.quickStats} aria-label="Base status">
          <div><span>Daily streak</span><strong>{streak || 0} day{streak === 1 ? "" : "s"}</strong></div>
          <div><span>Season score</span><strong>{player.seasonScore}</strong></div>
          <div><span>Clan status</span><strong>Open</strong></div>
        </section>
      </main>
    </GameShell>
  );
}
