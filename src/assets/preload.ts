import { getAssetPath, type AssetKey } from "./registry";

const preloadCache = new Map<string, Promise<void>>();
const retainedImages = new Map<string, HTMLImageElement>();

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

export function isAssetPreloaded(key: AssetKey): boolean {
  return retainedImages.has(getAssetPath(key));
}
