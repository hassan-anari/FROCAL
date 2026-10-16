import { useEffect } from "react";

/** Continue an existing list by observing its last row. Adds no DOM, control or spacing. */
export function QueryContinuation({ selector, hasNext, fetching, load }: { selector: string; hasNext: boolean; fetching: boolean; load: () => unknown }) {
  useEffect(() => {
    if (!hasNext || fetching) return;
    const target = document.querySelector(selector);
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting) && !document.hidden) load();
    }, { root: target.closest("[data-game-scroll]"), rootMargin: "120px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [selector, hasNext, fetching, load]);
  return null;
}
