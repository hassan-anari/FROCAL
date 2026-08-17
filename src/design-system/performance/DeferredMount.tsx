import { startTransition, useEffect, useState, type ReactNode } from "react";

interface DeferredMountProps {
  children: ReactNode;
  minHeight?: number | string;
  className?: string;
  timeout?: number;
}

/**
 * Defers non-critical, below-the-fold UI until the WebView has an idle slice.
 * The state update is wrapped in a transition so React can yield instead of
 * turning a large route mount into one long blocking task.
 */
export function DeferredMount({ children, minHeight = 0, className, timeout = 900 }: DeferredMountProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: number | null = null;
    let idleHandle: number | null = null;

    const reveal = () => {
      if (cancelled) return;
      startTransition(() => setReady(true));
    };

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(reveal, { timeout });
    } else {
      fallbackTimer = window.setTimeout(reveal, Math.min(320, timeout));
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleHandle);
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, [timeout]);

  if (ready) return <>{children}</>;
  return <div className={className} aria-hidden="true" style={{ minHeight }} />;
}
