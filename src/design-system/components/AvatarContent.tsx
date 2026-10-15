import { useAvatarSource } from "@/integrations/api/useAvatarSource";

/** Reuse existing avatar containers; failed photos reveal their original initials. */
export function AvatarContent({ owner, photoUrl, fallback }: { owner: string; photoUrl?: string | null; fallback: string }) {
  const avatar = useAvatarSource(owner, photoUrl);
  return avatar.src ? <img src={avatar.src} onError={avatar.onError} referrerPolicy="no-referrer" alt="" /> : fallback;
}
