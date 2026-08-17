import { useEffect } from "react";

let activeOverlayLocks = 0;

function syncMotionPauseClass(): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("motion-overlay-open", activeOverlayLocks > 0);
}

export function pulseBackgroundMotion(_duration = 240): void {
  // Route transitions no longer mutate a global class. Overlay locks below are
  // enough to pause the few ambient effects that actually matter.
}

export function usePauseBackgroundMotion(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof document === "undefined") return;

    let applied = false;
    const frame = window.requestAnimationFrame(() => {
      applied = true;
      activeOverlayLocks += 1;
      syncMotionPauseClass();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      if (!applied) return;
      activeOverlayLocks = Math.max(0, activeOverlayLocks - 1);
      syncMotionPauseClass();
    };
  }, [active]);
}
