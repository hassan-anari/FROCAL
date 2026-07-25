import { motion } from "motion/react";
import styles from "./AppLoader.module.css";

export function AppLoader({ label = "Initializing Dexo protocol" }: { label?: string }) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.core}>
        <motion.span
          className={styles.ring}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          className={styles.gem}
          animate={{ scale: [0.92, 1.06, 0.92], opacity: [0.72, 1, 0.72] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}
