import { useQueryFeedback } from "@/design-system/components/TransientFeedback";
import { readSessionPreference, writeSessionPreference } from "@/app/storageRelease";
import { useB3 } from "@/integrations/api/useB3";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import type { Attempt } from "@/integrations/api/b3Contracts";
import { useGameplayAvailability } from "@/integrations/api/useGameplayAvailability";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { DexoStage } from "@/design-system/components/DexoStage";
import { Button } from "@/design-system/primitives/Button";
import {
  TYPING_DAILY_LIMIT,
  getTypingAttemptsRemaining,
  useEarnStore,
} from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
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
  accuracy: number | null;
  wpm: number | null;
  score: number | null;
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
  const { canEarn } = useGameplayAvailability();
  const live = useB3();
  useQueryFeedback(live.remote ? live.typing.error : null, "Typing Arena couldn't load. Please try again.");
  const { scope } = useBootstrap();
  const [issued, setIssued] = useState<Attempt | null>(null);
  const submitted = useRef(false);
  const submissionKey = `dexo-b3-typing-submit:${scope.player}:${scope.season}`;
  const [pending, setPending] = useState<{ id: string; text: string } | null>(() => {
    try { const value = JSON.parse(localStorage.getItem(submissionKey) ?? "null"); return value && typeof value.id === "string" && typeof value.text === "string" && value.text.length <= 4096 ? value : null; } catch { return null; }
  });
  const navigate = useNavigate();
  const { adapter } = useTelegram();
  const recordTypingResult = useEarnStore((state) => state.recordTypingResult);
  const typingBest = useEarnStore((state) => state.typingBest);
  const typingAttemptDate = useEarnStore((state) => state.typingAttemptDate);
  const typingAttempts = useEarnStore((state) => state.typingAttempts);
  const attempt = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [target, setTarget] = useState(() => live.remote ? "" : phrases[Math.floor(Math.random() * phrases.length)]);
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_SECONDS);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<ChallengeResult | null>(null);

  const attemptsRemaining = live.remote ? live.typing.data?.attempts_remaining ?? 0 : getTypingAttemptsRemaining(typingAttemptDate, typingAttempts);
  const attemptLimit = live.remote ? live.typing.data?.attempt_limit ?? 0 : TYPING_DAILY_LIMIT;
  const challengeSeconds = issued?.challenge_seconds ?? CHALLENGE_SECONDS;
  const elapsed = challengeSeconds - timeLeft;
  const stats = useMemo(() => calculateStats(input, target, Math.max(1, elapsed)), [elapsed, input, target]);

  const returnToTypingTab = useCallback(() => {
    writeSessionPreference(earnTabStorageKey, "typing");
    startTransition(() => { void navigate({ to: "/earn" }); });
  }, [navigate]);

  const finish = useCallback(async () => {
    if (live.remote) {
      if (live.busy || submitted.current || (!issued && !pending) || (!started && !pending) || !canEarn("typing")) return;
      submitted.current = true;
      const body = pending ?? { id: issued!.attempt_id, text: input };
      setPending(body); setStarted(false);
      try { localStorage.setItem(submissionKey, JSON.stringify(body)); } catch { /* mounted retry retains exact text */ }
      const response = await live.submitTyping(body.id, body.text);
      if (response) {
        setResult({ accuracy: response.accuracy_bps === null ? null : response.accuracy_bps / 100, wpm: response.wpm, score: response.score ?? null, passed: response.status === "VALID" });
        setPending(null); try { localStorage.removeItem(submissionKey); } catch { /* server idempotency handles a retained submission */ }
        adapter.hapticNotice(response.status === "VALID" ? "success" : "warning");
      }
      submitted.current = false;
      return;
    }
    if (!canEarn("typing")) return;
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
  }, [adapter, attemptsRemaining, canEarn, input, recordTypingResult, result, started, target, timeLeft, live, issued, pending, submissionKey]);

  useEffect(() => {
    const active = live.typing.data?.active_attempt_detail;
    if (live.remote && active && !issued && !result && !pending) {
      setIssued(active); setTarget(active.phrase_text); setTimeLeft(Math.max(0, Math.ceil((Date.parse(active.expires_at) - live.serverNow()) / 1000))); setStarted(true);
    }
  }, [live.remote, live.typing.data?.active_attempt_detail, issued, result, pending]);

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
        return live.remote && issued ? Math.max(0, Math.ceil((Date.parse(issued.expires_at) - live.serverNow()) / 1000)) : current - 1;
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [result, started, live.remote, issued]);

  useEffect(() => {
    if (timeLeft === 0 && started && !result) finish();
  }, [finish, result, started, timeLeft]);

  useEffect(() => {
    if (input.length >= target.length && started && !result) finish();
  }, [finish, input.length, result, started, target.length]);

  const begin = async () => {
    if (live.remote) {
      if (live.busy || attemptsRemaining <= 0 || !canEarn("typing")) return;
      const response = await live.startTyping();
      if (!response) return;
      setIssued(response); setTarget(response.phrase_text); setTimeLeft(Math.max(0, Math.ceil((Date.parse(response.expires_at) - live.serverNow()) / 1000))); setInput(""); setResult(null); setStarted(true);
      adapter.hapticImpact("light"); window.setTimeout(() => inputRef.current?.focus(), 70); return;
    }
    if (attemptsRemaining <= 0 || !canEarn("typing")) return;
    setStarted(true);
    adapter.hapticImpact("light");
    window.setTimeout(() => inputRef.current?.focus(), 70);
  };

  const retry = () => {
    if (live.remote) { setIssued(null); setTarget(""); setInput(""); setTimeLeft(CHALLENGE_SECONDS); setStarted(false); setResult(null); return; }
    if (attemptsRemaining <= 0 || !canEarn("typing")) return;
    attempt.current += 1;
    setTarget(phrases[attempt.current % phrases.length]);
    setInput("");
    setTimeLeft(CHALLENGE_SECONDS);
    setStarted(false);
    setResult(null);
    adapter.selectionChanged();
  };

  return (
    <>
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
            <p>{live.remote ? "Finish the full phrase before time runs out. Your result will be checked when you submit." : `Finish the full phrase with at least ${PASS_ACCURACY}% accuracy and ${PASS_WPM} WPM.`}</p>
          </div>
          <DexoStage character="dexo.personalityFocused" characterScale={1.08} effect="idle" showParticles={false} showPlatform={false} className={styles.challengeDexo} />
        </section>

        <section className={styles.liveStats} aria-label="Live typing statistics">
          <div><span>Accuracy</span><strong>{Math.round(stats.accuracy)}%</strong></div>
          <div><span>WPM</span><strong>{Math.round(stats.wpm)}</strong></div>
          <div><span>Plays left</span><strong>{attemptsRemaining}/{attemptLimit}</strong></div>
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
            <motion.i animate={{ scaleX: (target.length ? Math.min(1, input.length / target.length) : 0) }} initial={false} style={{ transformOrigin: "0 50%" }} transition={mobileMotion.micro} />
          </div>
        </section>

        <AnimatePresence mode="popLayout">
          {result ? (
            <motion.section key="result" className={`${styles.resultCard} ${result.passed ? styles.resultPassed : styles.resultFailed}`} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={mobileMotion.reveal}>
              <span>{result.passed ? "ARENA CLEARED" : "RUN COMPLETE"}</span>
              <h2>{result.passed ? "Strong performance." : "Recalibrate and retry."}</h2>
              <div><strong>{result.accuracy === null ? "—" : `${Math.round(result.accuracy)}%`}</strong><small>accuracy</small><strong>{result.wpm === null ? "—" : Math.round(result.wpm)}</strong><small>WPM</small></div>
              <p>{attemptsRemaining > 0 ? `${attemptsRemaining} of ${attemptLimit} daily plays remain.` : "You have used today’s plays. Return after the reset for a fresh set."}</p>
              <div className={styles.resultActions}>
                <Button tone="secondary" disabled={attemptsRemaining <= 0 || live.busy || (live.remote && !canEarn("typing"))} onClick={retry}>Try again</Button>
                <Button trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={returnToTypingTab}>Back to Typing</Button>
              </div>
            </motion.section>
          ) : (
            <motion.div key="controls" className={styles.controls} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={mobileMotion.tab}>
              {pending && live.remote ? <Button size="lg" disabled={live.busy} onClick={() => { void finish(); }}>Try Again</Button> : !started ? (
                <Button size="lg" disabled={attemptsRemaining <= 0 || live.busy || (live.remote && !canEarn("typing"))} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={begin}>
                  {attemptsRemaining > 0 ? "Start arena run" : "Daily limit reached"}
                </Button>
              ) : (
                <Button tone="secondary" size="lg" disabled={live.busy} onClick={finish}>Finish now</Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
