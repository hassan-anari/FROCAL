import { getAssetPath, type AssetKey } from "./registry";

const preloadCache = new Map<string, Promise<void>>();

function preloadPath(path: string): Promise<void> {
  const cached = preloadCache.get(path);
  if (cached) return cached;

  const task = new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      resolve();
      return;
    }

    const image = new Image();
    const finish = () => resolve();

    image.onload = finish;
    image.onerror = finish;
    image.src = path;

    if (typeof image.decode === "function") {
      void image.decode().then(finish).catch(() => undefined);
    }
  });

  preloadCache.set(path, task);
  return task;
}

export function preloadAssets(keys: readonly AssetKey[]): Promise<void[]> {
  return Promise.all(keys.map((key) => preloadPath(getAssetPath(key))));
}
