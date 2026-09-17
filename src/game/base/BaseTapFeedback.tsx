import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "./BaseTapFeedback.module.css";

interface BaseTapFeedbackProps {
  tapCount: number;
}

interface TapBurst {
  id: number;
  x: number;
}

function xOffset(id: number): number {
  return ((id * 37) % 58) - 29;
}

export function BaseTapFeedback({ tapCount }: BaseTapFeedbackProps) {
  const [bursts, setBursts] = useState<TapBurst[]>([]);
  const previousCountRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const previous = previousCountRef.current;
    previousCountRef.current = tapCount;
    if (tapCount <= previous) return;

    const additions = Array.from({ length: tapCount - previous }, (_, index) => {
      const id = previous + index + 1;
      return { id, x: xOffset(id) };
    });
    setBursts((current) => [...current, ...additions]);

    additions.forEach((burst) => {
      const timer = window.setTimeout(() => {
        setBursts((current) => current.filter((item) => item.id !== burst.id));
      }, 900);
      timersRef.current.push(timer);
    });
  }, [tapCount]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    },
    [],
  );

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
