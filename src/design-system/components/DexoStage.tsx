import { AnimatePresence, motion } from "motion/react";
import { AssetImage } from "./AssetImage";
import type { AssetKey } from "@/assets/registry";
import styles from "./DexoStage.module.css";

interface DexoStageProps {
  character: AssetKey;
  className?: string;
  effect?: "idle" | "reveal" | "acquired" | "base";
  interactive?: boolean;
  onPress?: () => void;
  ariaLabel?: string;
}

const sparks = Array.from({ length: 7 }, (_, index) => index);

export function DexoStage({
  character,
  className = "",
  effect = "idle",
  interactive = false,
  onPress,
  ariaLabel = "Dexo companion",
}: DexoStageProps) {
  const content = (
    <div className={`${styles.stage} ${styles[effect]} ${className}`}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      <motion.div
        className={styles.orbit}
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 26, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
      />
      <AssetImage assetKey="dexo.platform" className={styles.platform} aria-hidden="true" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={character}
          className={styles.characterWrap}
          initial={{ opacity: 0, y: 16, scale: .9, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: [0, -5, 0], scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -8, scale: .96, filter: "blur(5px)" }}
          transition={{
            opacity: { duration: .34 },
            scale: { duration: .48, ease: [0.22, 1, 0.36, 1] },
            filter: { duration: .35 },
            y: { duration: 4.4, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY },
          }}
        >
          <AssetImage assetKey={character} className={styles.character} draggable={false} />
        </motion.div>
      </AnimatePresence>
      <div className={styles.sparks} aria-hidden="true">
        {sparks.map((spark) => <i key={spark} />)}
      </div>
      {effect === "acquired" ? <div className={styles.burst} aria-hidden="true" /> : null}
    </div>
  );

  if (!interactive) return content;

  return (
    <button type="button" className={styles.pressable} onClick={onPress} aria-label={ariaLabel}>
      {content}
    </button>
  );
}
