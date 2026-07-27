import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties } from "react";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
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
        initial={{ opacity: 0, scale: .975, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.015, y: -3 }}
        transition={mobileMotion.reveal}
      >
        <AssetImage assetKey={character} className={styles.character} draggable={false} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`${styles.stage} ${styles[effect]} ${className}`} style={stageStyle}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      {showPlatform ? <AssetImage assetKey="dexo.platform" className={styles.platform} aria-hidden="true" /> : null}

      <div className={styles.characterFloat}>
        {interactive ? (
          <button type="button" className={styles.characterButton} onClick={onPress} aria-label={ariaLabel}>
            {characterLayer}
          </button>
        ) : characterLayer}
      </div>

      {shouldShowParticles ? (
        <div className={styles.sparks} aria-hidden="true">
          {sparks.map((spark) => <i key={spark} />)}
        </div>
      ) : null}
    </div>
  );
}
