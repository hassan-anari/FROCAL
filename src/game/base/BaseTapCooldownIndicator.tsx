import { motion } from "motion/react";
import styles from "./BaseTapCooldownIndicator.module.css";

interface BaseTapCooldownIndicatorProps {
  cooldownCycle: number;
  cooldownMs: number;
  isCoolingDown: boolean;
}

export function BaseTapCooldownIndicator({
  cooldownCycle,
  cooldownMs,
  isCoolingDown,
}: BaseTapCooldownIndicatorProps) {
  return (
    <span
      className={`${styles.cooldown} ${isCoolingDown ? styles.cooling : styles.ready}`}
      aria-label={isCoolingDown ? "Base Tap cooling down" : "Base Tap ready"}
      title={isCoolingDown ? "Cooling down" : "Ready"}
    >
      <svg viewBox="0 0 24 24" role="presentation">
        <circle className={styles.track} cx="12" cy="12" r="9" />
        {isCoolingDown ? (
          <motion.circle
            key={cooldownCycle}
            className={styles.progress}
            cx="12"
            cy="12"
            r="9"
            pathLength="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: cooldownMs / 1000, ease: "linear" }}
          />
        ) : (
          <circle className={styles.progress} cx="12" cy="12" r="9" pathLength="1" />
        )}
      </svg>
      <i />
    </span>
  );
}
