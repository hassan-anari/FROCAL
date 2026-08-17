import { getAssetPath, type AssetKey } from "./registry";

const preloadCache = new Map<string, Promise<void>>();
const retainedImages = new Map<string, HTMLImageElement>();
let idlePreloadChain: Promise<void> = Promise.resolve();

interface IdleDeadlineLike {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleWindow extends Window {
  requestIdleCallback?: (callback: (deadline: IdleDeadlineLike) => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
}

interface IdlePreloadOptions {
  delay?: number;
  batchSize?: number;
  timeout?: number;
}

function preloadPath(path: string): Promise<void> {
  const cached = preloadCache.get(path);
  if (cached) return cached;

  const task = new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      resolve();
      return;
    }

    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      retainedImages.set(path, image);
      resolve();
    };

    image.decoding = "async";
    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    image.onerror = finish;
    image.src = path;

    if (image.complete && image.naturalWidth > 0) {
      if (typeof image.decode === "function") {
        void image.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    }
  });

  preloadCache.set(path, task);
  return task;
}

export function preloadAssets(keys: readonly AssetKey[]): Promise<void[]> {
  return Promise.all(keys.map((key) => preloadPath(getAssetPath(key))));
}

/**
 * Warm non-critical art without competing with route / overlay animation.
 * Mobile Telegram WebViews are especially sensitive to bursts of image decode,
 * so idle work is deliberately started in very small batches.
 */
export function preloadAssetsIdle(
  keys: readonly AssetKey[],
  options: IdlePreloadOptions = {},
): () => void {
  if (typeof window === "undefined" || keys.length === 0) return () => undefined;

  const delay = Math.max(0, options.delay ?? 420);
  const batchSize = Math.max(1, options.batchSize ?? 2);
  const timeout = Math.max(250, options.timeout ?? 1_800);
  const paths = Array.from(new Set(keys.map((key) => getAssetPath(key))));
  const idleWindow = window as IdleWindow;
  let index = 0;
  let cancelled = false;
  let timer: number | null = null;
  let idleHandle: number | null = null;

  const schedule = () => {
    if (cancelled || index >= paths.length) return;

    const work = (deadline: IdleDeadlineLike) => {
      idleHandle = null;
      if (cancelled) return;

      let started = 0;
      while (index < paths.length && started < batchSize) {
        if (!deadline.didTimeout && started > 0 && deadline.timeRemaining() < 6) break;
        const path = paths[index];
        index += 1;
        started += 1;
        idlePreloadChain = idlePreloadChain
          .then(() => preloadPath(path))
          .catch(() => undefined);
      }

      if (index < paths.length) schedule();
    };

    if (idleWindow.requestIdleCallback) {
      idleHandle = idleWindow.requestIdleCallback(work, { timeout });
    } else {
      timer = window.setTimeout(() => {
        timer = null;
        work({ didTimeout: true, timeRemaining: () => 0 });
      }, 120);
    }
  };

  timer = window.setTimeout(() => {
    timer = null;
    schedule();
  }, delay);

  return () => {
    cancelled = true;
    if (timer !== null) window.clearTimeout(timer);
    if (idleHandle !== null && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleHandle);
  };
}

export function isAssetPreloaded(key: AssetKey): boolean {
  return retainedImages.has(getAssetPath(key));
}
