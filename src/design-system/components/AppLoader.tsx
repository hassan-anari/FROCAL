import { motion } from "motion/react";
import { AssetImage } from "./AssetImage";
import styles from "./AppLoader.module.css";

export function AppLoader({ label = "Entering Dexo Land" }: { label?: string }) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <AssetImage assetKey="brand.logo" className={styles.logo} />
      <div className={styles.track} aria-hidden="true">
        <motion.span
          initial={{ x: "-100%" }}
          animate={{ x: "220%" }}
          transition={{ duration: 1.35, repeat: Infinity, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span>{label}</span>
    </div>
  );
}
