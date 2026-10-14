import { useEffect, useState, type ReactNode } from "react";

export function MockProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!import.meta.env.DEV || import.meta.env.VITE_DATA_SOURCE !== "msw");

  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.VITE_DATA_SOURCE !== "msw") return;

    let active = true;
    import("@/mocks/browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .then(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!ready) return null;
  return children;
}
