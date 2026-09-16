import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import styles from "./BaseTapFeedback.module.css";

interface BaseTapFeedbackProps {
  cooldownCycle: number;
  cooldownMs: number;
  isCoolingDown: boolean;
  tapSequence: number;
}

interface TapBurst {
  id: number;
  x: number;
}

export function BaseTapFeedback({
  cooldownCycle,
  cooldownMs,
  isCoolingDown,
  tapSequence,
}: BaseTapFeedbackProps) {
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

      <div className={`${styles.cooldown} ${isCoolingDown ? styles.cooling : styles.ready}`}>
        <svg viewBox="0 0 44 44" role="presentation">
          <circle className={styles.track} cx="22" cy="22" r="18" />
          {isCoolingDown ? (
            <motion.circle
              key={cooldownCycle}
              className={styles.progress}
              cx="22"
              cy="22"
              r="18"
              pathLength="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: cooldownMs / 1000, ease: "linear" }}
            />
          ) : (
            <circle className={styles.progress} cx="22" cy="22" r="18" pathLength="1" />
          )}
        </svg>
        <i />
      </div>
    </div>
  );
}
