import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import type { AssetKey } from "@/assets/registry";
import { DexoStage } from "@/design-system/components/DexoStage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { Button } from "@/design-system/primitives/Button";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./BasePage.module.css";

type ReactionKey = "curious" | "happy" | "focused" | "surprised" | "victory";

const reactionLibrary: Record<ReactionKey, { asset: AssetKey; scale: number; dialogues: string[] }> = {
  curious: { asset: "dexo.personalityCurious", scale: .99, dialogues: ["What are we discovering next?", "I found a signal worth following.", "Something new is waiting out there.", "Let’s take a closer look together."] },
  happy: { asset: "dexo.personalityHappy", scale: .96, dialogues: ["I’m glad you’re here.", "Base feels brighter with you around.", "That made my core glow.", "Ready for another good moment?"] },
  focused: { asset: "dexo.personalityFocused", scale: .99, dialogues: ["Systems aligned. I’m ready.", "One clear objective at a time.", "Focus locked. Let’s move.", "I’m tracking our next best step."] },
  surprised: { asset: "dexo.personalitySurprised", scale: .97, dialogues: ["Whoa — I didn’t expect that!", "Did you see that energy spike?", "Okay, that definitely got my attention.", "A new signal just appeared!"] },
  victory: { asset: "dexo.personalityVictory", scale: .96, dialogues: ["That’s the spirit — victory starts here!", "We’re building momentum already.", "Another step toward our legacy.", "I knew we could make that count."] },
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

const baseReactionAssets = ["dexo.platform", "dexo.level01", "dexo.level05", "dexo.level10", "dexo.level15", "dexo.level20", "dexo.level30", "dexo.personalityCurious", "dexo.personalityHappy", "dexo.personalityFocused", "dexo.personalitySurprised", "dexo.personalityVictory"] as const;

export function BasePage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const onboarding = useOnboardingStore();
  const { adapter } = useTelegram();
  const bootstrap = useQuery({ queryKey: queryKeys.bootstrap(scenario), queryFn: () => loadBootstrap(scenario, adapter.platform) });
  const [activeReaction, setActiveReaction] = useState<ReactionKey | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [typedDialogue, setTypedDialogue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  useEffect(() => () => { if (resetTimer.current !== null) window.clearTimeout(resetTimer.current); }, []);

  const telegramFirstName = adapter.getUser()?.first_name ?? "Explorer";
  const player = bootstrap.data?.player ?? { id: "pending-player", firstName: telegramFirstName, displayName: telegramFirstName, telegramUsername: null, avatarUrl: null, level: 1, xp: 120, xpToNextLevel: 500, seasonScore: 0, clanId: null };
  const xpPercent = useMemo(() => Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100)), [player.xp, player.xpToNextLevel]);
  const levelAsset = getLevelAsset(player.level);
  const displayedCharacter = activeReaction ? reactionLibrary[activeReaction].asset : levelAsset;
  const displayedScale = activeReaction ? reactionLibrary[activeReaction].scale : getLevelScale(player.level);

  const scheduleReturn = () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => { setActiveReaction(null); setDialogue(null); resetTimer.current = null; }, 10_000);
  };

  const triggerReaction = (requested?: ReactionKey) => {
    const reaction = requested ?? reactionOrder[reactionCursor.current % reactionOrder.length];
    if (!requested) reactionCursor.current += 1;
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

        <section className={styles.hero}>
          <div className={styles.worldLabel}><span>PERSONAL BASE</span><strong>DEXO ONLINE</strong></div>
          <DexoStage character={displayedCharacter} characterScale={displayedScale} effect="base" showParticles={false} interactive onPress={() => triggerReaction()} ariaLabel="Interact with Dexo" className={styles.dexoStage} />
          <AnimatePresence mode="wait">
            {dialogue ? (
              <motion.div key={dialogue} className={styles.reaction} initial={{ opacity: 0, y: 8, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: .98 }} transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }} role="status" aria-live="polite">
                <span className={styles.speaker}>DEXO</span>
                <span className={styles.dialogueText}>{typedDialogue}{isTyping ? <i className={styles.typingCursor} /> : null}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button type="button" className={styles.tapHint} onClick={() => triggerReaction()}><i /> Tap Dexo to interact</button>
        </section>

        <section className={styles.progressCard} aria-label="Dexo progression">
          <div className={styles.progressHeader}>
            <div><span>YOUR DEXO</span><strong>Newborn Companion</strong></div>
            <div className={styles.levelBadge}><span>LV.</span><strong>{player.level}</strong></div>
          </div>
          <div className={styles.xpLabels}><span>Growth progress</span><strong>{player.xp} / {player.xpToNextLevel} XP</strong></div>
          <div className={styles.xpTrack}><motion.i initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: .85 }} /></div>
          <Button size="lg" className={styles.helloButton} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={() => triggerReaction("happy")}>Say hello to Dexo</Button>
        </section>

        <section className={styles.nextAction}>
          <div className={styles.actionCopy}>
            <span>NEXT OBJECTIVE</span>
            <h2>Activate your first signal.</h2>
            <p>Complete a starter mission to earn XP and begin shaping your seasonal allocation.</p>
          </div>
          <div className={styles.actionMeta}><span>Starter path</span><strong>0 / 3</strong></div>
          <div className={styles.actionTrack}><i /></div>
          <button type="button" className={styles.openEarn} onClick={() => void navigate({ to: "/earn" })}>Open Earn <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} /></button>
        </section>

        <section className={styles.quickStats}>
          <div><span>Daily streak</span><strong>1 day</strong></div>
          <div><span>Season score</span><strong>{player.seasonScore}</strong></div>
          <div><span>Clan status</span><strong>Open</strong></div>
        </section>
      </main>
    </GameShell>
  );
}
