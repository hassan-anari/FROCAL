import type { TapController } from "./controller";

/** Caller owns the authenticated controller's lifetime and must close it on identity
 * or Season/config switch. Hidden time never extends an old grant locally. */
export function bindTapLifecycle(controller: TapController) {
  const visibility = () => { if (document.hidden) controller.suspend(); else void controller.resume(); };
  const suspend = () => { void controller.releaseSession(); };
  const resume = () => { if (!document.hidden) void controller.resume(); };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", suspend);
  window.addEventListener("pageshow", resume);
  window.addEventListener("online", resume);
  return () => {
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", suspend);
    window.removeEventListener("pageshow", resume);
    window.removeEventListener("online", resume);
    controller.close();
  };
}
