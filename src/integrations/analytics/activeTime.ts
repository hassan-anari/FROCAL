/** Coarse foreground estimate, not a session replacement. No interaction events
 * leave the browser. Count at most 30 seconds after the latest local activity. */
export function observeActiveTime(capture: (seconds: number) => void, now = () => performance.now()) {
  let tick = now();
  let lastActivity = tick;
  let seconds = 0;
  let nativeActive = true;
  const sample = () => {
    const time = now();
    if (!document.hidden && nativeActive) seconds += Math.max(0, Math.min(time, lastActivity + 30_000) - tick) / 1000;
    tick = time;
  };
  const flush = () => { sample(); if (seconds >= 1) capture(Math.min(60, seconds)); seconds = 0; };
  const activity = () => { sample(); lastActivity = now(); };
  const visibility = () => { flush(); tick = now(); lastActivity = document.hidden ? -Infinity : tick; };
  const native = (active: boolean) => { flush(); nativeActive = active; tick = now(); lastActivity = active ? tick : -Infinity; };
  const inputs = ["pointerdown", "keydown", "scroll"] as const;
  inputs.forEach(name => window.addEventListener(name, activity, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", flush);
  const timer = window.setInterval(flush, 60_000);
  return {
    flush, native,
    stop() {
      flush(); window.clearInterval(timer);
      inputs.forEach(name => window.removeEventListener(name, activity, true));
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
    },
  };
}
