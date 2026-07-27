import { useEffect } from "react";

let activeOverlayLocks = 0;

export function usePauseBackgroundMotion(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;

    activeOverlayLocks += 1;
    document.documentElement.classList.add("motion-overlay-open");

    return () => {
      activeOverlayLocks = Math.max(0, activeOverlayLocks - 1);
      if (activeOverlayLocks === 0) document.documentElement.classList.remove("motion-overlay-open");
    };
  }, [active]);
}
