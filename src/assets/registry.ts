import manifest from "./manifest.json";

export type AssetRecord = (typeof manifest.assets)[number];
export type AssetKey = AssetRecord["key"];

const assetMap = new Map(manifest.assets.map((asset) => [asset.key, asset] as const));

export const assetRegistry = Object.freeze({
  version: manifest.version,
  assets: manifest.assets,
});

export function getAsset(key: AssetKey): AssetRecord {
  const asset = assetMap.get(key);
  if (!asset) {
    throw new Error(`Unknown asset key: ${key}`);
  }
  return asset;
}

function withAssetVersion(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(manifest.version)}`;
}

export function getAssetPath(key: AssetKey): string {
  return withAssetVersion(getAsset(key).path);
}

export function listAssetsForPhase(phase: number): AssetRecord[] {
  return manifest.assets.filter((asset) => asset.requiredInPhase <= phase);
}
