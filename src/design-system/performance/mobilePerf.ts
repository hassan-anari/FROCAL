export interface MobilePerfSample {
  id: number;
  label: string;
  startedAt: number;
  inputToFrameMs: number;
  windowMs: number;
  estimatedFrameBudgetMs: number;
  maxFrameGapMs: number;
  droppedFrames: number;
  slowFrames16: number;
  slowFrames33: number;
  longTaskCount: number;
  longTaskTotalMs: number;
  worstLongTaskMs: number;
  stableByMs: number;
  occurrence: number;
  isFirstOccurrence: boolean;
}

export interface MobilePerfSnapshot {
  enabled: boolean;
  samples: MobilePerfSample[];
  estimatedFrameBudgetMs: number;
  totalLongTaskCount: number;
  worstLongTaskMs: number;
  worstInteractionFrameGapMs: number;
  totalDroppedFrames: number;
}

interface LongTaskRecord {
  startTime: number;
  duration: number;
}

interface ActiveInteraction {
  id: number;
  label: string;
  startedAt: number;
  deadlineAt: number;
  frameBudgetMs: number;
  occurrence: number;
  firstFrameAt: number | null;
  previousFrameAt: number | null;
  maxFrameGapMs: number;
  droppedFrames: number;
  slowFrames16: number;
  slowFrames33: number;
  lastUnstableAt: number;
  healthyFramesAfterUnstable: number;
  stableByMs: number;
  rafId: number;
}

const storageKey = "dalexio-mobile-perf-enabled";
const sampleEvent = "dalexio:mobile-perf-sample";
const interactionWindowMs = 450;
const longTaskRetentionMs = 8_000;
const defaultFrameBudgetMs = 16.7;

let initialized = false;
let enabled = false;
let nextId = 1;
let samples: MobilePerfSample[] = [];
let longTasks: LongTaskRecord[] = [];
let observer: PerformanceObserver | null = null;
let monitorRaf = 0;
let previousMonitorFrameAt = 0;
let recentFrameGaps: number[] = [];
let estimatedFrameBudgetMs = defaultFrameBudgetMs;
let totalLongTaskCount = 0;
let worstLongTaskMs = 0;
let worstInteractionFrameGapMs = 0;
let totalDroppedFrames = 0;
let lastPointerDownAt = 0;
const activeInteractions = new Map<number, ActiveInteraction>();
const interactionOccurrences = new Map<string, number>();

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
  const control = target.closest<HTMLElement>(
    "[data-perf-label], button, a, input, select, summary, [role='tab'], [role='button'], [role='menuitem'], [role='option']",
  );
  const element = control ?? target.closest<HTMLElement>("[aria-label], [title], h1, h2, h3, p, span, div") ?? target;
  const explicit = element.getAttribute("aria-label") || element.getAttribute("title") || (element instanceof HTMLElement ? element.dataset.perfLabel : undefined);
  const text = element.textContent?.replace(/\s+/g, " ").trim();
  const fallback = element.id ? `${element.tagName.toLowerCase()}#${element.id}` : element.tagName.toLowerCase();
  return (explicit || text || fallback || "interaction").slice(0, 72);
}

function pruneLongTasks(now: number): void {
  const cutoff = now - longTaskRetentionMs;
  if (longTasks.length > 0 && longTasks[0].startTime < cutoff) {
    longTasks = longTasks.filter((task) => task.startTime + task.duration >= cutoff);
  }
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return defaultFrameBudgetMs;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * fraction)));
  return sorted[index] ?? defaultFrameBudgetMs;
}

function updateFrameBudget(gap: number): void {
  if (gap < 4 || gap > 24) return;
  recentFrameGaps.push(gap);
  if (recentFrameGaps.length > 90) recentFrameGaps.shift();
  if (recentFrameGaps.length < 8) return;

  // The lower quartile tracks the device's native cadence without letting an
  // occasional missed frame make a 120 Hz phone look like a 60 Hz phone.
  const candidate = percentile(recentFrameGaps, 0.25);
  estimatedFrameBudgetMs = Math.min(20, Math.max(7, candidate));
}

function countDroppedFrames(gap: number, budget: number): number {
  if (gap <= budget * 1.45) return 0;
  return Math.max(1, Math.round(gap / budget) - 1);
}

function interactionLongTasks(interaction: ActiveInteraction): LongTaskRecord[] {
  const start = interaction.startedAt;
  const end = interaction.deadlineAt;
  return longTasks.filter((task) => {
    const taskEnd = task.startTime + task.duration;
    return task.startTime <= end && taskEnd >= start;
  });
}

function finalizeInteraction(interaction: ActiveInteraction): void {
  if (!enabled) return;
  activeInteractions.delete(interaction.id);
  pruneLongTasks(performance.now());

  const matchingLongTasks = interactionLongTasks(interaction);
  const longTaskTotalMs = matchingLongTasks.reduce((sum, task) => sum + task.duration, 0);
  const interactionWorstLongTaskMs = matchingLongTasks.reduce((worst, task) => Math.max(worst, task.duration), 0);
  const firstFrameAt = interaction.firstFrameAt ?? interaction.startedAt;

  worstInteractionFrameGapMs = Math.max(worstInteractionFrameGapMs, interaction.maxFrameGapMs);
  totalDroppedFrames += interaction.droppedFrames;

  samples = [
    {
      id: interaction.id,
      label: interaction.label,
      startedAt: interaction.startedAt,
      inputToFrameMs: Math.max(0, firstFrameAt - interaction.startedAt),
      windowMs: interactionWindowMs,
      estimatedFrameBudgetMs: interaction.frameBudgetMs,
      maxFrameGapMs: interaction.maxFrameGapMs,
      droppedFrames: interaction.droppedFrames,
      slowFrames16: interaction.slowFrames16,
      slowFrames33: interaction.slowFrames33,
      longTaskCount: matchingLongTasks.length,
      longTaskTotalMs,
      worstLongTaskMs: interactionWorstLongTaskMs,
      stableByMs: interaction.stableByMs,
      occurrence: interaction.occurrence,
      isFirstOccurrence: interaction.occurrence === 1,
    },
    ...samples,
  ];
  emit();
}

function interactionFrame(interactionId: number, now: number): void {
  const interaction = activeInteractions.get(interactionId);
  if (!interaction || !enabled) return;

  if (document.visibilityState !== "visible") {
    interaction.previousFrameAt = null;
    interaction.rafId = window.requestAnimationFrame((timestamp) => interactionFrame(interactionId, timestamp));
    return;
  }

  if (interaction.firstFrameAt === null) {
    interaction.firstFrameAt = now;
  }

  if (interaction.previousFrameAt !== null) {
    const gap = Math.max(0, now - interaction.previousFrameAt);
    interaction.maxFrameGapMs = Math.max(interaction.maxFrameGapMs, gap);
    interaction.droppedFrames += countDroppedFrames(gap, interaction.frameBudgetMs);
    if (gap > 16.7) interaction.slowFrames16 += 1;
    if (gap > 33.4) interaction.slowFrames33 += 1;

    const unstable = gap > interaction.frameBudgetMs * 1.55;
    if (unstable) {
      interaction.lastUnstableAt = now;
      interaction.healthyFramesAfterUnstable = 0;
    } else if (interaction.lastUnstableAt > 0) {
      interaction.healthyFramesAfterUnstable += 1;
      if (interaction.healthyFramesAfterUnstable >= 3) {
        interaction.stableByMs = Math.max(0, now - interaction.startedAt);
        interaction.lastUnstableAt = 0;
      }
    }
  }

  interaction.previousFrameAt = now;

  if (now >= interaction.deadlineAt) {
    finalizeInteraction(interaction);
    return;
  }

  interaction.rafId = window.requestAnimationFrame((timestamp) => interactionFrame(interactionId, timestamp));
}

function recordInteraction(label: string, startedAt: number): void {
  if (!enabled || !canUseDom()) return;
  const id = nextId++;
  const occurrence = (interactionOccurrences.get(label) ?? 0) + 1;
  interactionOccurrences.set(label, occurrence);
  const interaction: ActiveInteraction = {
    id,
    label,
    startedAt,
    deadlineAt: startedAt + interactionWindowMs,
    frameBudgetMs: estimatedFrameBudgetMs,
    occurrence,
    firstFrameAt: null,
    previousFrameAt: null,
    maxFrameGapMs: 0,
    droppedFrames: 0,
    slowFrames16: 0,
    slowFrames33: 0,
    lastUnstableAt: 0,
    healthyFramesAfterUnstable: 0,
    stableByMs: 0,
    rafId: 0,
  };
  activeInteractions.set(id, interaction);
  interaction.rafId = window.requestAnimationFrame((timestamp) => interactionFrame(id, timestamp));
}

function handlePointerDown(event: PointerEvent): void {
  if (!enabled || event.button > 0) return;
  lastPointerDownAt = performance.now();
}

function handleClick(event: MouseEvent): void {
  if (!enabled) return;
  const now = performance.now();
  const startedAt = lastPointerDownAt > 0 && now - lastPointerDownAt < 1_000 ? lastPointerDownAt : now;
  lastPointerDownAt = 0;
  recordInteraction(labelForTarget(event.target), startedAt);
}

function startLongTaskObserver(): void {
  if (!enabled || observer || typeof PerformanceObserver === "undefined") return;
  try {
    const supported = PerformanceObserver.supportedEntryTypes ?? [];
    if (!supported.includes("longtask")) return;
    observer = new PerformanceObserver((list) => {
      const now = performance.now();
      for (const entry of list.getEntries()) {
        longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        totalLongTaskCount += 1;
        worstLongTaskMs = Math.max(worstLongTaskMs, entry.duration);
      }
      pruneLongTasks(now);
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

function monitorFrame(now: number): void {
  if (!enabled) return;
  if (document.visibilityState !== "visible") {
    previousMonitorFrameAt = 0;
  } else if (previousMonitorFrameAt > 0) {
    updateFrameBudget(now - previousMonitorFrameAt);
  }
  previousMonitorFrameAt = now;
  monitorRaf = window.requestAnimationFrame(monitorFrame);
}

function startFrameMonitor(): void {
  if (!canUseDom() || monitorRaf) return;
  previousMonitorFrameAt = 0;
  monitorRaf = window.requestAnimationFrame(monitorFrame);
}

function stopFrameMonitor(): void {
  if (!canUseDom() || !monitorRaf) return;
  window.cancelAnimationFrame(monitorRaf);
  monitorRaf = 0;
  previousMonitorFrameAt = 0;
}

function cancelActiveInteractions(): void {
  for (const interaction of activeInteractions.values()) {
    if (interaction.rafId) window.cancelAnimationFrame(interaction.rafId);
  }
  activeInteractions.clear();
}

function syncEnabledState(): void {
  if (!canUseDom()) return;
  if (enabled) {
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("click", handleClick, true);
    startLongTaskObserver();
    startFrameMonitor();
  } else {
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("click", handleClick, true);
    lastPointerDownAt = 0;
    stopLongTaskObserver();
    stopFrameMonitor();
    cancelActiveInteractions();
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
  cancelActiveInteractions();
  samples = [];
  longTasks = [];
  recentFrameGaps = [];
  estimatedFrameBudgetMs = defaultFrameBudgetMs;
  totalLongTaskCount = 0;
  worstLongTaskMs = 0;
  worstInteractionFrameGapMs = 0;
  totalDroppedFrames = 0;
  lastPointerDownAt = 0;
  interactionOccurrences.clear();
  emit();
}

export function getMobilePerformanceSnapshot(): MobilePerfSnapshot {
  return {
    enabled,
    samples: [...samples],
    estimatedFrameBudgetMs,
    totalLongTaskCount,
    worstLongTaskMs,
    worstInteractionFrameGapMs,
    totalDroppedFrames,
  };
}

export const mobilePerformanceSampleEvent = sampleEvent;
