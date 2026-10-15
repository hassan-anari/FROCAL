import type { TelegramAdapter } from "@/integrations/telegram/adapter";

export type GameDestination = "/base" | "/earn" | "/earn/typing" | "/profile" | "/clan" | "/arena";
const routes = new Set<GameDestination>(["/base", "/earn", "/earn/typing", "/profile", "/clan", "/arena"]);
/** Local UI safety policy; wire destination fields remain defined by the server contract. */
export function safeDestination(value: string | null | undefined, origin = window.location.origin):
  { kind: "internal"; path: GameDestination } | { kind: "telegram" | "external"; url: string } | null {
  if (!value || value !== value.trim() || /[\u0000-\u0020\u007f\\]/.test(value) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return routes.has(value as GameDestination) ? { kind: "internal", path: value as GameDestination } : null;
  if (!/^https:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    if (url.origin === origin) return routes.has(url.pathname as GameDestination) && !url.search && !url.hash ? { kind: "internal", path: url.pathname as GameDestination } : null;
    return { kind: ["t.me", "telegram.me"].includes(url.hostname) ? "telegram" : "external", url: url.href };
  } catch { return null; }
}

export function navigateSafely(value: string | null | undefined, adapter: Pick<TelegramAdapter, "openTelegramLink" | "openExternalLink">, navigate: (path: GameDestination) => void) {
  const destination = safeDestination(value);
  if (!destination) return false;
  if (destination.kind === "internal") navigate(destination.path);
  else if (destination.kind === "telegram") adapter.openTelegramLink(destination.url);
  else adapter.openExternalLink(destination.url);
  return true;
}
