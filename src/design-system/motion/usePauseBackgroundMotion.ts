import { useLayoutEffect } from "react";

let activeOverlayLocks = 0;
let activeTransientLocks = 0;

function syncMotionPauseClass(): void {
  if (typeof document === "undefined") return;
  const paused = activeOverlayLocks + activeTransientLocks > 0;
  document.documentElement.classList.toggle("motion-overlay-open", paused);
}

export function pulseBackgroundMotion(duration = 240): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  activeTransientLocks += 1;
  syncMotionPauseClass();

  window.setTimeout(() => {
    activeTransientLocks = Math.max(0, activeTransientLocks - 1);
    syncMotionPauseClass();
  }, duration);
}

export function usePauseBackgroundMotion(active: boolean): void {
  useLayoutEffect(() => {
    if (!active || typeof document === "undefined") return;

    activeOverlayLocks += 1;
    syncMotionPauseClass();

    return () => {
      activeOverlayLocks = Math.max(0, activeOverlayLocks - 1);
      syncMotionPauseClass();
    };
  }, [active]);
}
