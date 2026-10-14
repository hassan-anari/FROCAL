/** Internal delivery abstraction. The B2 adapter supplies verified cache metadata
 * or a credential-in-memory loader after its exact backend contract is pinned. */
export type AvatarDelivery =
  | { kind: "url"; url: string }
  | { kind: "authenticated"; load: (signal: AbortSignal) => Promise<Blob> };
export interface VerifiedAvatar {
  owner: string;
  version: string;
  delivery: AvatarDelivery | null;
}

export function safeAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (!/^https?:\/\//i.test(value) && (!value.startsWith("/") || value.startsWith("//"))) return null;
    return url.href;
  } catch { return null; }
}

/** A present cache descriptor always outranks external Telegram metadata, even
 * when unavailable. Failure uses initials, never repeated blocked-host requests. */
export function chooseAvatarDelivery(owner: string, cached: VerifiedAvatar | undefined, legacyUrl?: string | null): AvatarDelivery | null {
  if (cached) return cached.owner === owner ? cached.delivery : null;
  const url = safeAvatarUrl(legacyUrl);
  return url ? { kind: "url", url } : null;
}

/** Actual Bootstrap/Profile photo_url from WEDCAL's avatar_url; opaque URL is
 * the version and bearer delivery capability. No parallel endpoint is constructed. */
export function serverCachedAvatar(owner: string, photo: string | null | undefined): VerifiedAvatar | undefined {
  const safe = safeAvatarUrl(photo);
  if (!safe) return undefined;
  const url = new URL(safe);
  return /^\/api\/v1\/profile\/avatar\/[0-9a-f-]{36}$/i.test(url.pathname) && url.protocol === "https:"
    ? { owner, version: safe, delivery: { kind: "url", url: safe } } : undefined;
}
