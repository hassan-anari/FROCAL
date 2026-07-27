import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties } from "react";
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
  characterScale?: number;
  showParticles?: boolean;
  showPlatform?: boolean;
}

const sparks = Array.from({ length: 7 }, (_, index) => index);

export function DexoStage({
  character,
  className = "",
  effect = "idle",
  interactive = false,
  onPress,
  ariaLabel = "Dexo companion",
  characterScale = 1,
  showParticles,
  showPlatform = true,
}: DexoStageProps) {
  const shouldShowParticles = showParticles ?? effect === "acquired";
  const stageStyle = {
    "--dexo-character-scale": characterScale,
  } as CSSProperties;

  const characterLayer = (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={character}
        className={styles.characterLayer}
        initial={{ opacity: 0, scale: .97, filter: "blur(5px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 1.025, filter: "blur(4px)" }}
        transition={{ duration: .46, ease: [0.22, 1, 0.36, 1] }}
      >
        <AssetImage assetKey={character} className={styles.character} draggable={false} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`${styles.stage} ${styles[effect]} ${className}`} style={stageStyle}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      {showPlatform ? <AssetImage assetKey="dexo.platform" className={styles.platform} aria-hidden="true" /> : null}

      <motion.div
        className={styles.characterFloat}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 4.8, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
      >
        {interactive ? (
          <button type="button" className={styles.characterButton} onClick={onPress} aria-label={ariaLabel}>
            {characterLayer}
          </button>
        ) : characterLayer}
      </motion.div>

      {shouldShowParticles ? (
        <div className={styles.sparks} aria-hidden="true">
          {sparks.map((spark) => <i key={spark} />)}
        </div>
      ) : null}
    </div>
  );
}
