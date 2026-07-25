import { useState, type ImgHTMLAttributes } from "react";
import { getAsset, type AssetKey } from "@/assets/registry";

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  assetKey: AssetKey;
}

export function AssetImage({ assetKey, onError, ...props }: AssetImageProps) {
  const asset = getAsset(assetKey);
  const [src, setSrc] = useState(asset.path);

  return (
    <img
      {...props}
      src={src}
      alt={asset.alt}
      onError={(event) => {
        setSrc("/assets/system/missing-asset.svg");
        onError?.(event);
      }}
    />
  );
}
