import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { AppLoader } from "@/design-system/components/AppLoader";
import { DexoStage } from "@/design-system/components/DexoStage";
import { Button } from "@/design-system/primitives/Button";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import type { AssetKey } from "@/assets/registry";
import styles from "./BasePage.module.css";

type ReactionKey = "curious" | "happy" | "focused" | "surprised" | "victory";

const reactionLibrary: Record<ReactionKey, { asset: AssetKey; scale: number; dialogues: string[] }> = {
  curious: {
    asset: "dexo.personalityCurious",
    scale: .99,
    dialogues: [
      "What are we discovering next?",
      "I found a signal worth following.",
      "Something new is waiting out there.",
      "Let’s take a closer look together.",
    ],
  },
  happy: {
    asset: "dexo.personalityHappy",
    scale: .96,
    dialogues: [
      "I’m glad you’re here.",
      "Base feels brighter with you around.",
      "That made my core glow.",
      "Ready for another good moment?",
    ],
  },
  focused: {
    asset: "dexo.personalityFocused",
    scale: .99,
    dialogues: [
      "Systems aligned. I’m ready.",
      "One clear objective at a time.",
      "Focus locked. Let’s move.",
      "I’m tracking our next best step.",
    ],
  },
  surprised: {
    asset: "dexo.personalitySurprised",
    scale: .97,
    dialogues: [
      "Whoa — I didn’t expect that!",
      "Did you see that energy spike?",
      "Okay, that definitely got my attention.",
      "A new signal just appeared!",
    ],
  },
  victory: {
    asset: "dexo.personalityVictory",
    scale: .96,
    dialogues: [
      "That’s the spirit — victory starts here!",
      "We’re building momentum already.",
      "Another step toward our legacy.",
      "I knew we could make that count.",
    ],
  },
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
  if (level >= 30) return .94;
  if (level >= 20) return .96;
  if (level >= 15) return .98;
  if (level >= 10) return 1;
  if (level >= 5) return 1.03;
  return 1.08;
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
  const { adapter } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });
  const [activeReaction, setActiveReaction] = useState<ReactionKey | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const reactionCursor = useRef(0);
  const dialogueCursor = useRef<Record<ReactionKey, number>>({ curious: 0, happy: 0, focused: 0, surprised: 0, victory: 0 });
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    if (onboarding.status !== "completed") void navigate({ to: "/onboarding" });
  }, [navigate, onboarding.status]);

  useEffect(() => {
    adapter.disableVerticalSwipes();
    return () => adapter.enableVerticalSwipes();
  }, [adapter]);

  useEffect(() => {
    let active = true;
    void preloadAssets(baseReactionAssets).then(() => {
      if (active) setAssetsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const player = bootstrap.data?.player;
  const firstName = adapter.getUser()?.first_name ?? player?.firstName ?? "Explorer";
  const initials = firstName.trim().slice(0, 1).toUpperCase();
  const xpPercent = useMemo(() => {
    if (!player) return 0;
    return Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100));
  }, [player]);

  if (bootstrap.isPending || !player || !assetsReady) return <AppLoader />;

  const levelAsset = getLevelAsset(player.level);
  const displayedCharacter = activeReaction ? reactionLibrary[activeReaction].asset : levelAsset;
  const displayedScale = activeReaction ? reactionLibrary[activeReaction].scale : getLevelScale(player.level);

  const scheduleReturnToLevel = () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => {
      setActiveReaction(null);
      setDialogue(null);
      resetTimer.current = null;
    }, 10_000);
  };

  const triggerReaction = (requested?: ReactionKey) => {
    const reaction = requested ?? reactionOrder[reactionCursor.current % reactionOrder.length];
    if (!requested) reactionCursor.current += 1;

    const entry = reactionLibrary[reaction];
    const index = dialogueCursor.current[reaction] % entry.dialogues.length;
    dialogueCursor.current[reaction] += 1;

    setActiveReaction(reaction);
    setDialogue(entry.dialogues[index]);
    scheduleReturnToLevel();
    adapter.hapticImpact(reaction === "victory" ? "medium" : "soft");
  };

  const sayHello = () => {
    triggerReaction("happy");
    adapter.hapticNotice("success");
  };

  return (
    <main className={styles.stage}>
      <div className={styles.ambientBackdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.playerIdentity}>
          {adapter.getUser()?.photo_url ? (
            <img src={adapter.getUser()?.photo_url} alt="" className={styles.avatar} />
          ) : (
            <span className={styles.avatarFallback}>{initials}</span>
          )}
          <div>
            <span>Welcome back</span>
            <strong>{firstName}</strong>
          </div>
        </div>
        <div className={styles.seasonPill}>
          <i />
          Season One
        </div>
      </header>

      <section className={styles.world}>
        <div className={styles.worldLabel}>
          <span>PERSONAL BASE</span>
          <strong>DEXO ONLINE</strong>
        </div>
        <DexoStage
          character={displayedCharacter}
          characterScale={displayedScale}
          effect="base"
          showParticles={false}
          interactive
          onPress={() => triggerReaction()}
          ariaLabel="Interact with Dexo"
          className={styles.dexoStage}
        />
        <AnimatePresence mode="wait">
          {dialogue ? (
            <motion.div
              key={dialogue}
              className={styles.reaction}
              initial={{ opacity: 0, y: 8, scale: .96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, scale: .98 }}
              transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }}
              role="status"
              aria-live="polite"
            >
              <span className={styles.speaker}>DEXO</span>
              <span>{dialogue}</span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <section className={styles.hud} aria-label="Player progression">
        <div className={styles.hudHeader}>
          <div>
            <span>YOUR DEXO</span>
            <strong>Newborn Companion</strong>
          </div>
          <div className={styles.levelBadge}>
            <span>LV.</span>
            <strong>{player.level}</strong>
          </div>
        </div>

        <div className={styles.xpRow}>
          <div className={styles.xpLabels}>
            <span>Growth progress</span>
            <strong>{player.xp} / {player.xpToNextLevel} XP</strong>
          </div>
          <div className={styles.xpTrack}>
            <motion.i initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: .9, delay: .18 }} />
          </div>
        </div>

        <Button
          size="lg"
          className={styles.actionButton}
          trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={19} strokeWidth={1.9} />}
          onClick={sayHello}
        >
          Say hello to Dexo
        </Button>
      </section>
    </main>
  );
}
