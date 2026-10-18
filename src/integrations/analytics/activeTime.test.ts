import { afterEach, expect, it, vi } from "vitest";
import { observeActiveTime } from "./activeTime";
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
it("caps foreground at the idle boundary and excludes hidden/native inactive intervals", () => {
  vi.useFakeTimers(); let time = 0;
  const captured = vi.fn(); const active = observeActiveTime(captured, () => time);
  time = 60_000; active.flush(); expect(captured).toHaveBeenLastCalledWith(30);
  time = 90_000; active.flush(); expect(captured).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new Event("pointerdown")); time = 100_000; active.flush(); expect(captured).toHaveBeenLastCalledWith(10);
  Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
  document.dispatchEvent(new Event("visibilitychange")); time = 500_000; active.flush(); expect(captured).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  document.dispatchEvent(new Event("visibilitychange")); time = 505_000; active.native(false); expect(captured).toHaveBeenLastCalledWith(5);
  time = 600_000; active.flush(); expect(captured).toHaveBeenCalledTimes(3);
  active.native(true); time = 610_000; active.stop(); expect(captured).toHaveBeenLastCalledWith(10);
});
