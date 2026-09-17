import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import styles from "./BaseTapFeedback.module.css";

interface BaseTapFeedbackProps {
  tapSequence: number;
}

interface BaseTapCooldownRingProps {
  cooldownCycle: number;
  cooldownMs: number;
  isCoolingDown: boolean;
}

interface TapBurst {
  id: number;
  x: number;
}

export function BaseTapFeedback({ tapSequence }: BaseTapFeedbackProps) {
  const [bursts, setBursts] = useState<TapBurst[]>([]);
  const xOffset = useMemo(() => ((tapSequence * 37) % 46) - 23, [tapSequence]);

  useEffect(() => {
    if (tapSequence <= 0) return;
    const burst = { id: tapSequence, x: xOffset };
    setBursts((current) => [...current, burst]);
    const timer = window.setTimeout(() => {
      setBursts((current) => current.filter((item) => item.id !== burst.id));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [tapSequence, xOffset]);

  return (
    <div className={styles.layer} aria-hidden="true">
      <AnimatePresence>
        {bursts.map((burst) => (
          <motion.span
            key={burst.id}
            className={styles.tapBurst}
            initial={{ opacity: 0, y: 8, x: burst.x, scale: 0.72 }}
            animate={{ opacity: [0, 1, 1, 0], y: -86, x: burst.x, scale: [0.72, 1.12, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
          >
            +1
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function BaseTapCooldownRing({
  cooldownCycle,
  cooldownMs,
  isCoolingDown,
}: BaseTapCooldownRingProps) {
  return (
    <span
      className={`${styles.cooldown} ${isCoolingDown ? styles.cooling : styles.ready}`}
      aria-label={isCoolingDown ? "Base Tap cooling down" : "Base Tap ready"}
      title={isCoolingDown ? "Base Tap cooling down" : "Base Tap ready"}
    >
      <svg viewBox="0 0 32 32" role="presentation">
        <circle className={styles.track} cx="16" cy="16" r="12" />
        {isCoolingDown ? (
          <motion.circle
            key={cooldownCycle}
            className={styles.progress}
            cx="16"
            cy="16"
            r="12"
            pathLength="1"
            initial={{ pathLength: 1 }}
            animate={{ pathLength: 0 }}
            transition={{ duration: cooldownMs / 1000, ease: "linear" }}
          />
        ) : (
          <circle className={styles.progress} cx="16" cy="16" r="12" pathLength="1" />
        )}
      </svg>
      <i />
    </span>
  );
}
