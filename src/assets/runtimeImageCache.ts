/*
 * Keep a deliberately small set of recently displayed raster images alive.
 *
 * HTTP caching prevents the bytes from being downloaded again, but embedded
 * mobile WebViews may discard decoded image surfaces as soon as a route
 * unmounts. Retaining a handful of already-rendered <img> nodes gives the
 * browser a chance to reuse their decoded resource when the user returns to a
 * recently visited page, without pinning the entire asset catalog in memory.
 */
const MAX_RETAINED_RASTER_IMAGES = 12;
const retainedImages = new Map<string, HTMLImageElement>();

function normalizeImageUrl(src: string): string {
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.href).href;
  } catch {
    return src;
  }
}

function isRasterAsset(src: string): boolean {
  const pathname = src.split("?", 1)[0]?.toLowerCase() ?? "";
  return /\.(?:avif|webp|png|jpe?g)$/.test(pathname);
}

export function retainRenderedAssetImage(image: HTMLImageElement): void {
  const source = image.currentSrc || image.src;
  if (!source || !isRasterAsset(source)) return;

  const key = normalizeImageUrl(source);
  if (retainedImages.has(key)) retainedImages.delete(key);
  retainedImages.set(key, image);

  while (retainedImages.size > MAX_RETAINED_RASTER_IMAGES) {
    const oldest = retainedImages.entries().next().value as [string, HTMLImageElement] | undefined;
    if (!oldest) break;

    const [oldestKey, oldestImage] = oldest;
    retainedImages.delete(oldestKey);

    // If React has already removed the node, release its resource explicitly.
    // Connected images are never modified because they may still be visible.
    if (!oldestImage.isConnected) oldestImage.removeAttribute("src");
  }
}

export function isRenderedAssetWarm(src: string): boolean {
  return retainedImages.has(normalizeImageUrl(src));
}
