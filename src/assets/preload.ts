import { getAssetPath, type AssetKey } from "./registry";

/*
 * Asset warming is intentionally fetch-only. The previous implementation kept
 * decoded Image elements alive for the lifetime of the app and explicitly
 * decoded many 1004x1004 WEBPs in parallel. On mobile Telegram WebViews that
 * can consume a large bitmap budget and compete with navigation/overlay frames.
 *
 * Here we let the browser warm the HTTP cache at low priority without pinning
 * decoded bitmaps in JS memory. Visible <img> elements still decode normally
 * when they are actually needed.
 */
const preloadCache = new Map<string, Promise<void>>();
const queue: Array<{ path: string; resolve: () => void }> = [];
let activeJobs = 0;
let pumpTimer: number | null = null;
const maxConcurrentWarmups = 2;

function canUseDom(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function schedulePump(): void {
  if (!canUseDom() || pumpTimer !== null) return;
  pumpTimer = window.setTimeout(() => {
    pumpTimer = null;
    pumpQueue();
  }, 180);
}

function warmWithPrefetch(path: string): Promise<void> {
  return new Promise((resolve) => {
    if (!canUseDom()) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      link.onload = null;
      link.onerror = null;
      link.remove();
      resolve();
    };

    link.rel = "prefetch";
    link.as = "image";
    link.href = path;
    link.setAttribute("fetchpriority", "low");
    link.onload = finish;
    link.onerror = finish;
    document.head.appendChild(link);

    // Some embedded WebViews do not dispatch load/error for rel=prefetch.
    window.setTimeout(finish, 4_000);
  });
}

function pumpQueue(): void {
  while (activeJobs < maxConcurrentWarmups && queue.length > 0) {
    const job = queue.shift();
    if (!job) return;
    activeJobs += 1;
    void warmWithPrefetch(job.path).finally(() => {
      activeJobs = Math.max(0, activeJobs - 1);
      job.resolve();
      if (queue.length > 0) schedulePump();
    });
  }
}

function preloadPath(path: string): Promise<void> {
  const cached = preloadCache.get(path);
  if (cached) return cached;

  const task = new Promise<void>((resolve) => {
    if (!canUseDom()) {
      resolve();
      return;
    }
    queue.push({ path, resolve });
    schedulePump();
  });

  preloadCache.set(path, task);
  return task;
}

export function preloadAssets(keys: readonly AssetKey[]): Promise<void[]> {
  return Promise.all(keys.map((key) => preloadPath(getAssetPath(key))));
}

export function isAssetPreloaded(key: AssetKey): boolean {
  return preloadCache.has(getAssetPath(key));
}
