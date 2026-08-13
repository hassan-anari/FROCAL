import { useState, type ImgHTMLAttributes } from "react";
import { getAsset, type AssetKey } from "@/assets/registry";

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  assetKey: AssetKey;
}

export function AssetImage({ assetKey, onError, ...props }: AssetImageProps) {
  const asset = getAsset(assetKey);
  const [failedAssetKey, setFailedAssetKey] = useState<AssetKey | null>(null);
  const src = failedAssetKey === assetKey ? "/assets/system/missing-asset.svg" : asset.path;

  return (
    <img
      {...props}
      src={src}
      alt={asset.alt}
      onError={(event) => {
        setFailedAssetKey(assetKey);
        onError?.(event);
      }}
    />
  );
}
