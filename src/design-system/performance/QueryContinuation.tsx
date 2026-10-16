import { useEffect, useRef } from "react";

/** Invisible continuation of an existing scroll list; no additional control or layout. */
export function QueryContinuation({ hasNext, fetching, load }: { hasNext: boolean; fetching: boolean; load: () => unknown }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!hasNext || fetching || !ref.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !document.hidden) load();
    }, { root: ref.current.closest("[data-game-scroll]"), rootMargin: "120px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasNext, fetching, load]);
  return <span ref={ref} aria-hidden="true" />;
}
