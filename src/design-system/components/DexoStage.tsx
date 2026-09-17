import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useRef } from "react";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { AssetImage } from "./AssetImage";
import type { AssetKey } from "@/assets/registry";
import styles from "./DexoStage.module.css";

interface DexoStageProps {
  character: AssetKey;
  className?: string;
  effect?: "idle" | "reveal" | "acquired" | "base";
  interactive?: boolean;
  multiTouch?: boolean;
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
  multiTouch = false,
  onPress,
  ariaLabel = "Dexo companion",
  characterScale = 1,
  showParticles,
  showPlatform = true,
}: DexoStageProps) {
  const shouldShowParticles = showParticles ?? effect === "acquired";
  const stableBaseCharacter = useRef(character);
  const stableBaseScale = useRef(characterScale);
  const personalitySwap = character.startsWith("dexo.personality");

  // Keep the reaction system/assets intact, but suppress personality swaps on Base for now.
  // Real level/stage asset changes are still allowed through immediately.
  if (effect !== "base" || !personalitySwap) {
    stableBaseCharacter.current = character;
    stableBaseScale.current = characterScale;
  }

  const renderedCharacter =
    effect === "base" && personalitySwap ? stableBaseCharacter.current : character;
  const renderedScale =
    effect === "base" && personalitySwap ? stableBaseScale.current : characterScale;
  const stageStyle = {
    "--dexo-character-scale": renderedScale,
  } as CSSProperties;

  const characterLayer = (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={renderedCharacter}
        className={styles.characterLayer}
        initial={{ opacity: 0, scale: .975, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.015, y: -3 }}
        transition={mobileMotion.reveal}
      >
        <AssetImage assetKey={renderedCharacter} className={styles.character} draggable={false} />
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className={`${styles.stage} ${styles[effect]} ${className}`} style={stageStyle}>
      <div className={styles.ambientGlow} aria-hidden="true" />
      {showPlatform ? <AssetImage assetKey="dexo.platform" className={styles.platform} aria-hidden="true" /> : null}

      <div className={styles.characterFloat}>
        {interactive ? (
          <button
            type="button"
            className={styles.characterButton}
            style={multiTouch ? { touchAction: "none" } : undefined}
            onPointerDown={
              multiTouch
                ? (event) => {
                    if (event.pointerType === "mouse" && event.button !== 0) return;
                    event.preventDefault();
                    onPress?.();
                  }
                : undefined
            }
            onClick={
              multiTouch
                ? (event) => {
                    // Keyboard activation has detail=0. Pointer input is handled on pointerdown so
                    // touch/mouse clicks do not double-count.
                    if (event.detail === 0) onPress?.();
                  }
                : onPress
            }
            aria-label={ariaLabel}
          >
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
