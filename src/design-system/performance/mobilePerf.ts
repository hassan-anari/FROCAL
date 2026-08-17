export interface MobilePerfSample {
  id: number;
  label: string;
  startedAt: number;
  inputToFrameMs: number;
  settleMs: number;
  frameGapMs: number;
  longTaskMs: number;
}

export interface MobilePerfSnapshot {
  enabled: boolean;
  samples: MobilePerfSample[];
  longTaskCount: number;
  worstLongTaskMs: number;
  worstFrameGapMs: number;
}

const storageKey = "dalexio-mobile-perf-enabled";
const sampleEvent = "dalexio:mobile-perf-sample";
const maxSamples = 24;

let initialized = false;
let enabled = false;
let nextId = 1;
let samples: MobilePerfSample[] = [];
let longTaskCount = 0;
let worstLongTaskMs = 0;
let worstFrameGapMs = 0;
let lastLongTaskMs = 0;
let observer: PerformanceObserver | null = null;
let frameRaf = 0;
let previousFrameAt = 0;

function canUseDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function readStoredEnabled(): boolean {
  if (!canUseDom()) return false;
  try {
    return sessionStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function emit(): void {
  if (!canUseDom()) return;
  window.dispatchEvent(new CustomEvent(sampleEvent));
}

function labelForTarget(target: EventTarget | null): string {
  if (!(target instanceof Element)) return "interaction";
  const control = target.closest<HTMLElement>("button, a, [role='tab'], [role='button']");
  if (!control) return "interaction";
  const explicit = control.getAttribute("aria-label") || control.getAttribute("title") || control.dataset.perfLabel;
  const text = control.textContent?.replace(/\s+/g, " ").trim();
  return (explicit || text || control.tagName.toLowerCase()).slice(0, 56);
}

function recordInteraction(label: string, startedAt: number): void {
  if (!enabled || !canUseDom()) return;
  const longTaskAtStart = lastLongTaskMs;

  window.requestAnimationFrame((firstFrameAt) => {
    if (!enabled) return;
    window.requestAnimationFrame((secondFrameAt) => {
      if (!enabled) return;
      const frameGap = Math.max(0, secondFrameAt - firstFrameAt);
      worstFrameGapMs = Math.max(worstFrameGapMs, frameGap);
      samples = [
        {
          id: nextId++,
          label,
          startedAt,
          inputToFrameMs: Math.max(0, firstFrameAt - startedAt),
          settleMs: Math.max(0, secondFrameAt - startedAt),
          frameGapMs: frameGap,
          longTaskMs: Math.max(0, lastLongTaskMs - longTaskAtStart),
        },
        ...samples,
      ].slice(0, maxSamples);
      emit();
    });
  });
}

function handlePointerUp(event: PointerEvent): void {
  if (!enabled) return;
  const control = event.target instanceof Element
    ? event.target.closest("button, a, [role='tab'], [role='button']")
    : null;
  if (!control) return;
  recordInteraction(labelForTarget(control), performance.now());
}

function startLongTaskObserver(): void {
  if (!enabled || observer || typeof PerformanceObserver === "undefined") return;
  try {
    const supported = PerformanceObserver.supportedEntryTypes ?? [];
    if (!supported.includes("longtask")) return;
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longTaskCount += 1;
        lastLongTaskMs += entry.duration;
        worstLongTaskMs = Math.max(worstLongTaskMs, entry.duration);
      }
      emit();
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    observer = null;
  }
}

function stopLongTaskObserver(): void {
  observer?.disconnect();
  observer = null;
}

function frameLoop(now: number): void {
  if (!enabled) return;
  if (previousFrameAt > 0) {
    const gap = now - previousFrameAt;
    if (gap > worstFrameGapMs) {
      worstFrameGapMs = gap;
      if (gap > 34) emit();
    }
  }
  previousFrameAt = now;
  frameRaf = window.requestAnimationFrame(frameLoop);
}

function startFrameMonitor(): void {
  if (!canUseDom() || frameRaf) return;
  previousFrameAt = 0;
  frameRaf = window.requestAnimationFrame(frameLoop);
}

function stopFrameMonitor(): void {
  if (!canUseDom() || !frameRaf) return;
  window.cancelAnimationFrame(frameRaf);
  frameRaf = 0;
  previousFrameAt = 0;
}

function syncEnabledState(): void {
  if (!canUseDom()) return;
  if (enabled) {
    document.addEventListener("pointerup", handlePointerUp, true);
    startLongTaskObserver();
    startFrameMonitor();
  } else {
    document.removeEventListener("pointerup", handlePointerUp, true);
    stopLongTaskObserver();
    stopFrameMonitor();
  }
}

export function initMobilePerformanceMonitor(): void {
  if (initialized || !canUseDom()) return;
  initialized = true;
  enabled = readStoredEnabled();
  syncEnabledState();
}

export function setMobilePerformanceMonitorEnabled(value: boolean): void {
  if (!canUseDom()) return;
  initMobilePerformanceMonitor();
  if (enabled === value) return;
  enabled = value;
  try {
    sessionStorage.setItem(storageKey, value ? "1" : "0");
  } catch {
    // Session storage can be unavailable in hardened WebViews.
  }
  syncEnabledState();
  emit();
}

export function resetMobilePerformanceMetrics(): void {
  samples = [];
  longTaskCount = 0;
  worstLongTaskMs = 0;
  worstFrameGapMs = 0;
  lastLongTaskMs = 0;
  emit();
}

export function getMobilePerformanceSnapshot(): MobilePerfSnapshot {
  return {
    enabled,
    samples: [...samples],
    longTaskCount,
    worstLongTaskMs,
    worstFrameGapMs,
  };
}

export const mobilePerformanceSampleEvent = sampleEvent;
