import { useEffect, useState } from "react";
import { chooseAvatarDelivery, safeAvatarUrl, type VerifiedAvatar } from "./avatarSource";

// Memory-only failure suppression; bounded so browsing profiles cannot grow it forever.
const failures = new Set<string>();
function rememberFailure(key: string) {
  if (failures.size >= 128) failures.delete(failures.values().next().value!);
  failures.add(key);
}

export function useAvatarSource(owner: string, legacyUrl?: string | null, cached?: VerifiedAvatar) {
  const delivery = chooseAvatarDelivery(owner, cached, legacyUrl);
  const url = delivery?.kind === "url" ? safeAvatarUrl(delivery.url) : null;
  const loader = delivery?.kind === "authenticated" ? delivery.load : undefined;
  const key = JSON.stringify([owner, cached?.version ?? "legacy", url, Boolean(loader)]);
  const [failed, setFailed] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  useEffect(() => {
    if (!loader || failures.has(key)) return;
    const abort = new AbortController();
    let objectUrl: string | null = null;
    void loader(abort.signal).then((blob) => {
      if (abort.signal.aborted) return;
      if (!["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(blob.type) || blob.size > 5_000_000) throw new Error("Invalid avatar image");
      objectUrl = URL.createObjectURL(blob);
      setLoaded({ key, url: objectUrl });
    }).catch(() => {
      if (!abort.signal.aborted) { rememberFailure(key); setFailed(key); }
    });
    return () => { abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [key, loader]);
  return {
    src: failed === key || failures.has(key) ? null : loader ? loaded?.key === key ? loaded.url : null : url,
    onError: () => { rememberFailure(key); setFailed(key); },
  };
}
