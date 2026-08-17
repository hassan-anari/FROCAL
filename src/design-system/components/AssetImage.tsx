import { useState, type ImgHTMLAttributes } from "react";
import { getAsset, getAssetPath, type AssetKey } from "@/assets/registry";
import { retainRenderedAssetImage } from "@/assets/runtimeImageCache";

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  assetKey: AssetKey;
}

export function AssetImage({ assetKey, onError, onLoad, decoding = "async", ...props }: AssetImageProps) {
  const asset = getAsset(assetKey);
  const [failedAssetKey, setFailedAssetKey] = useState<AssetKey | null>(null);
  const src = failedAssetKey === assetKey ? getAssetPath("system.missing") : getAssetPath(assetKey);

  return (
    <img
      {...props}
      src={src}
      alt={asset.alt}
      decoding={decoding}
      onLoad={(event) => {
        retainRenderedAssetImage(event.currentTarget);
        onLoad?.(event);
      }}
      onError={(event) => {
        setFailedAssetKey(assetKey);
        onError?.(event);
      }}
    />
  );
}
