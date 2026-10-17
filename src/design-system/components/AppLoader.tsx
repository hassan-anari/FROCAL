import { motion, useReducedMotion } from "motion/react";
import { AssetImage } from "./AssetImage";
import styles from "./AppLoader.module.css";

export function AppLoader({ label = "Entering Dexo Land", artwork = "brand.logo", compact = false }: { label?: string; artwork?: "brand.logo" | "clan.hq"; compact?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className={`${styles.root} ${compact ? styles.compact : ""}`} role="status" aria-live="polite" aria-label={label}>
      <AssetImage assetKey={artwork} className={styles.logo} />
      <div className={styles.track} aria-hidden="true">
        <motion.span
          initial={{ x: "-100%" }}
          animate={{ x: reduced ? "70%" : "220%" }}
          transition={{ duration: reduced ? 0 : 1.35, repeat: reduced ? 0 : Infinity, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}
