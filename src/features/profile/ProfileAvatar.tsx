import { AssetImage } from "@/design-system/components/AssetImage";
import { frameById } from "@/game/profile/profileCatalog";
import type { FrameId } from "@/game/profile/types";
import styles from "./ProfileAvatar.module.css";

interface ProfileAvatarProps {
  firstName: string;
  photoUrl?: string | null;
  frameId: FrameId;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ProfileAvatar({ firstName, photoUrl, frameId, size = "md", className = "" }: ProfileAvatarProps) {
  const initial = firstName.trim().slice(0, 1).toUpperCase() || "D";
  const frame = frameById[frameId];

  return (
    <div className={`${styles.avatar} ${styles[size]} ${className}`}>
      <div className={styles.photoWell}>
        {photoUrl ? <img src={photoUrl} alt="" className={styles.photo} /> : <span className={styles.fallback}>{initial}</span>}
      </div>
      <AssetImage assetKey={frame.asset} className={styles.frame} loading="eager" draggable={false} />
    </div>
  );
}
