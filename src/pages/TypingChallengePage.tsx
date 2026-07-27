import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { DexoStage } from "@/design-system/components/DexoStage";
import { GameShell } from "@/design-system/components/GameShell";
import { Button } from "@/design-system/primitives/Button";
import {
  TYPING_DAILY_LIMIT,
  getTypingAttemptsRemaining,
  useEarnStore,
} from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./TypingChallengePage.module.css";

const phrases = [
  "Every completed mission brings Dexo closer to a new evolution.",
  "Daily practice turns careful explorers into confident champions.",
  "A strong clan grows when every member contributes with purpose.",
  "Seasonal journeys reward patience, curiosity, and consistent effort.",
  "Dexo learns new abilities as your experience continues to grow.",
  "The brightest achievements begin with one focused action today.",
  "Explore every corner of Dexo Land and collect meaningful rewards.",
  "Accuracy improves when your hands stay relaxed and your mind stays calm.",
  "Great companions celebrate progress and learn from every challenge.",
  "A new season creates fresh goals for explorers across the world.",
  "Small daily victories can unlock powerful upgrades over time.",
  "Teamwork helps every clan reach milestones that feel impossible alone.",
  "The Typing Arena rewards speed, control, and steady concentration.",
  "Complete your objectives and watch your companion become stronger.",
  "Curious explorers discover opportunities hidden beyond familiar paths.",
  "Every achievement tells a story about the journey you completed.",
  "Build your profile with medals, titles, and memorable seasonal moments.",
  "Invite trusted friends and grow a community that learns together.",
  "Consistent practice creates the confidence needed for harder missions.",
  "Your adventure in Dexo Land becomes richer with every new discovery.",
];

const CHALLENGE_SECONDS = 30;
const PASS_ACCURACY = 85;
const PASS_WPM = 10;
const earnTabStorageKey = "dalexio-earn-active-tab";

interface ChallengeResult {
  accuracy: number;
  wpm: number;
  score: number;
  passed: boolean;
}

function calculateStats(input: string, target: string, elapsedSeconds: number) {
  const compared = Math.max(1, input.length);
  const correct = input.split("").reduce((total, character, index) => total + (character === target[index] ? 1 : 0), 0);
  const accuracy = Math.min(100, (correct / compared) * 100);
  const minutes = Math.max(1 / 60, elapsedSeconds / 60);
  const wpm = (correct / 5) / minutes;
  return { correct, accuracy, wpm, score: Math.round(accuracy * Math.max(1, wpm)) };
}

export function TypingChallengePage() {
  const navigate = useNavigate();
  const { adapter } = useTelegram();
  const recordTypingResult = useEarnStore((state) => state.recordTypingResult);
  const typingBest = useEarnStore((state) => state.typingBest);
  const typingAttemptDate = useEarnStore((state) => state.typingAttemptDate);
  const typingAttempts = useEarnStore((state) => state.typingAttempts);
  const attempt = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [target, setTarget] = useState(() => phrases[Math.floor(Math.random() * phrases.length)]);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SECONDS);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  const attemptsRemaining = getTypingAttemptsRemaining(typingAttemptDate, typingAttempts);
  const elapsed = CHALLENGE_SECONDS - timeLeft;
  const stats = useMemo(() => calculateStats(input, target, Math.max(1, elapsed)), [elapsed, input, target]);

  const returnToTypingTab = useCallback(() => {
    sessionStorage.setItem(earnTabStorageKey, "typing");
    void navigate({ to: "/earn" });
  }, [navigate]);

  const finish = useCallback(() => {
    if (result || !started || attemptsRemaining <= 0) return;
    const finalStats = calculateStats(input, target, Math.max(1, CHALLENGE_SECONDS - timeLeft));
    const passed = finalStats.accuracy >= PASS_ACCURACY && finalStats.wpm >= PASS_WPM && input.length >= target.length;
    const nextResult = { ...finalStats, passed };
    setResult(nextResult);
    setStarted(false);
    recordTypingResult({
      accuracy: nextResult.accuracy,
      wpm: nextResult.wpm,
      score: nextResult.score,
      completedAt: new Date().toISOString(),
    });
    adapter.hapticNotice(passed ? "success" : "warning");
  }, [adapter, attemptsRemaining, input, recordTypingResult, result, started, target, timeLeft]);

  useEffect(() => {
    void preloadAssets(["dexo.personalityFocused"]);
  }, []);

  useEffect(() => {
    const cleanupBack = adapter.showBackButton(returnToTypingTab);
    adapter.disableVerticalSwipes();
    return () => {
      cleanupBack();
      adapter.enableVerticalSwipes();
    };
  }, [adapter, returnToTypingTab]);

  useEffect(() => {
    if (!started || result) return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [result, started]);

  useEffect(() => {
    if (timeLeft === 0 && started && !result) finish();
  }, [finish, result, started, timeLeft]);

  useEffect(() => {
    if (input.length >= target.length && started && !result) finish();
  }, [finish, input.length, result, started, target.length]);

  const begin = () => {
    if (attemptsRemaining <= 0) return;
    setStarted(true);
    adapter.hapticImpact("light");
    window.setTimeout(() => inputRef.current?.focus(), 70);
  };

  const retry = () => {
    if (attemptsRemaining <= 0) return;
    attempt.current += 1;
    setTarget(phrases[attempt.current % phrases.length]);
    setInput("");
    setTimeLeft(CHALLENGE_SECONDS);
    setStarted(false);
    setResult(null);
    adapter.selectionChanged();
  };

  return (
    <GameShell hideNavigation>
      <main className={styles.page}>
        <header className={styles.header}>
          <button type="button" onClick={returnToTypingTab} aria-label="Back to Typing tab">
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />
          </button>
          <div><span>PERMANENT MINI GAME</span><strong>Typing Arena</strong></div>
          <em>{String(timeLeft).padStart(2, "0")}s</em>
        </header>

        <section className={styles.challengeHero}>
          <div>
            <span>DAILY PRACTICE</span>
            <h1>Type with intent.</h1>
            <p>Finish the full phrase with at least {PASS_ACCURACY}% accuracy and {PASS_WPM} WPM.</p>
          </div>
          <DexoStage character="dexo.personalityFocused" characterScale={1.08} effect="idle" showParticles={false} showPlatform={false} className={styles.challengeDexo} />
        </section>

        <section className={styles.liveStats} aria-label="Live typing statistics">
          <div><span>Accuracy</span><strong>{Math.round(stats.accuracy)}%</strong></div>
          <div><span>WPM</span><strong>{Math.round(stats.wpm)}</strong></div>
          <div><span>Plays left</span><strong>{attemptsRemaining}/{TYPING_DAILY_LIMIT}</strong></div>
        </section>

        <section className={styles.typingCard}>
          <div
            className={styles.targetText}
            aria-label="Target phrase"
            onCopy={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
          >
            {target.split("").map((character, index) => {
              const typed = input[index];
              const className = index < input.length
                ? typed === character ? styles.correct : styles.incorrect
                : index === input.length ? styles.current : "";
              return <span key={`${character}-${index}`} className={className}>{character}</span>;
            })}
          </div>

          <textarea
            ref={inputRef}
            value={input}
            disabled={!started || result !== null || attemptsRemaining <= 0}
            onChange={(event) => setInput(event.target.value.slice(0, target.length))}
            placeholder={attemptsRemaining <= 0 ? "Daily play limit reached." : started ? "Start typing here…" : "Tap Start when you are ready."}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onCopy={(event) => event.preventDefault()}
            onCut={(event) => event.preventDefault()}
            onPaste={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
            onDrop={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && ["v", "c", "x"].includes(event.key.toLowerCase())) event.preventDefault();
            }}
            aria-label="Typing challenge input"
          />

          <div className={styles.challengeProgress}>
            <motion.i animate={{ width: `${Math.min(100, (input.length / target.length) * 100)}%` }} transition={{ duration: .16 }} />
          </div>
        </section>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.section key="result" className={`${styles.resultCard} ${result.passed ? styles.resultPassed : styles.resultFailed}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span>{result.passed ? "ARENA CLEARED" : "RUN COMPLETE"}</span>
              <h2>{result.passed ? "Strong performance." : "Recalibrate and retry."}</h2>
              <div><strong>{Math.round(result.accuracy)}%</strong><small>accuracy</small><strong>{Math.round(result.wpm)}</strong><small>WPM</small></div>
              <p>{attemptsRemaining > 0 ? `${attemptsRemaining} of ${TYPING_DAILY_LIMIT} daily plays remain.` : "You have used all five plays for today. Return tomorrow for a fresh set."}</p>
              <div className={styles.resultActions}>
                <Button tone="secondary" disabled={attemptsRemaining <= 0} onClick={retry}>Try again</Button>
                <Button trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={returnToTypingTab}>Back to Typing</Button>
              </div>
            </motion.section>
          ) : (
            <motion.div key="controls" className={styles.controls} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!started ? (
                <Button size="lg" disabled={attemptsRemaining <= 0} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={begin}>
                  {attemptsRemaining > 0 ? "Start arena run" : "Daily limit reached"}
                </Button>
              ) : (
                <Button tone="secondary" size="lg" onClick={finish}>Finish now</Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </GameShell>
  );
}
