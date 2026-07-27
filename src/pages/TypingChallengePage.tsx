import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { DexoStage } from "@/design-system/components/DexoStage";
import { GameShell } from "@/design-system/components/GameShell";
import { Button } from "@/design-system/primitives/Button";
import { useEarnStore } from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./TypingChallengePage.module.css";

const phrases = [
  "Signals grow stronger when explorers move with precision.",
  "Every clear mission brings Dexo closer to the next evolution.",
  "Focus turns small actions into powerful seasonal momentum.",
];

const CHALLENGE_SECONDS = 30;
const PASS_ACCURACY = 85;
const PASS_WPM = 10;

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
  const attempt = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [target, setTarget] = useState(phrases[0]);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SECONDS);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  const elapsed = CHALLENGE_SECONDS - timeLeft;
  const stats = useMemo(() => calculateStats(input, target, Math.max(1, elapsed)), [elapsed, input, target]);

  const finish = useCallback(() => {
    if (result) return;
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
  }, [adapter, input, recordTypingResult, result, target, timeLeft]);

  useEffect(() => {
    void preloadAssets(["dexo.platform", "dexo.personalityFocused"]);
  }, []);

  useEffect(() => {
    const cleanupBack = adapter.showBackButton(() => void navigate({ to: "/earn" }));
    adapter.disableVerticalSwipes();
    return () => {
      cleanupBack();
      adapter.enableVerticalSwipes();
    };
  }, [adapter, navigate]);

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
    setStarted(true);
    adapter.hapticImpact("light");
    window.setTimeout(() => inputRef.current?.focus(), 70);
  };

  const retry = () => {
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
          <button type="button" onClick={() => void navigate({ to: "/earn" })} aria-label="Back to Earn">
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />
          </button>
          <div><span>SKILL MISSION</span><strong>Typing Protocol</strong></div>
          <em>{String(timeLeft).padStart(2, "0")}s</em>
        </header>

        <section className={styles.challengeHero}>
          <div>
            <span>PRECISION CORE</span>
            <h1>Type with intent.</h1>
            <p>Finish the signal with at least {PASS_ACCURACY}% accuracy and {PASS_WPM} WPM.</p>
          </div>
          <DexoStage character="dexo.personalityFocused" characterScale={1.04} effect="idle" showParticles={false} className={styles.challengeDexo} />
        </section>

        <section className={styles.liveStats} aria-label="Live typing statistics">
          <div><span>Accuracy</span><strong>{Math.round(stats.accuracy)}%</strong></div>
          <div><span>WPM</span><strong>{Math.round(stats.wpm)}</strong></div>
          <div><span>Best</span><strong>{typingBest ? Math.round(typingBest.wpm) : "—"}</strong></div>
        </section>

        <section className={styles.typingCard}>
          <div className={styles.targetText} aria-label="Target phrase">
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
            disabled={!started || result !== null}
            onChange={(event) => setInput(event.target.value.slice(0, target.length))}
            placeholder={started ? "Start typing the signal…" : "Tap Start when you are ready."}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Typing challenge input"
          />

          <div className={styles.challengeProgress}>
            <motion.i animate={{ width: `${Math.min(100, (input.length / target.length) * 100)}%` }} transition={{ duration: .16 }} />
          </div>
        </section>

        <AnimatePresence mode="wait">
          {result ? (
            <motion.section key="result" className={`${styles.resultCard} ${result.passed ? styles.resultPassed : styles.resultFailed}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <span>{result.passed ? "PROTOCOL CLEARED" : "SIGNAL INCOMPLETE"}</span>
              <h2>{result.passed ? "Reward unlocked." : "Recalibrate and retry."}</h2>
              <div><strong>{Math.round(result.accuracy)}%</strong><small>accuracy</small><strong>{Math.round(result.wpm)}</strong><small>WPM</small></div>
              <p>{result.passed ? "Return to Mission Control and claim 160 XP." : `Reach ${PASS_ACCURACY}% accuracy and finish the full phrase before time expires.`}</p>
              <div className={styles.resultActions}>
                <Button tone="secondary" onClick={retry}>Try again</Button>
                <Button trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={() => void navigate({ to: "/earn" })}>
                  {result.passed ? "Claim in Earn" : "Back to missions"}
                </Button>
              </div>
            </motion.section>
          ) : (
            <motion.div key="controls" className={styles.controls} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!started ? (
                <Button size="lg" trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={begin}>Start protocol</Button>
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
