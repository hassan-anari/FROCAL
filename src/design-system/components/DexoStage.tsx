import { AnimatePresence, motion } from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";
import { PhysicalPointers } from "@/game/base/physicalPointers";
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
  baseCharacter?: AssetKey;
  baseCharacterScale?: number;
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
  baseCharacter,
  baseCharacterScale,
}: DexoStageProps) {
  const shouldShowParticles = showParticles ?? effect === "acquired";
  const pointers = useRef(new PhysicalPointers());
  useEffect(() => {
    const reset = () => pointers.current.reset();
    const hidden = () => { if (document.hidden) reset(); };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", hidden);
      reset();
    };
  }, []);
  const stableBaseCharacter = useRef(character);
  const stableBaseScale = useRef(characterScale);
  const personalitySwap = character.startsWith("dexo.personality");

  // Keep the reaction system/assets intact, but suppress personality swaps on Base for now.
  // Real level/stage asset changes are still allowed through immediately.
  if (baseCharacter || effect !== "base" || !personalitySwap) {
    stableBaseCharacter.current = baseCharacter ?? character;
    stableBaseScale.current = baseCharacterScale ?? characterScale;
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
                    event.preventDefault();
                    const native = event.nativeEvent as PointerEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } };
                    if (!pointers.current.down({
                      pointerId: event.pointerId, pointerType: event.pointerType, button: event.button,
                      isTrusted: native.isTrusted, emulatedMouse: native.sourceCapabilities?.firesTouchEvents,
                    })) return;
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onPress?.();
                  }
                : undefined
            }
            onClick={
              multiTouch
                ? (event) => {
                    // Economic interaction accepts physical pointerdowns only.
                    event.preventDefault();
                  }
                : onPress
            }
            onPointerUp={multiTouch ? (event) => pointers.current.up(event.pointerId) : undefined}
            onPointerCancel={multiTouch ? (event) => pointers.current.up(event.pointerId) : undefined}
            onLostPointerCapture={multiTouch ? (event) => pointers.current.up(event.pointerId) : undefined}
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
