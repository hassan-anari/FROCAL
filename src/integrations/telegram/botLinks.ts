/** Public bot URL only; credentials and launch data never belong in this config. */
export function configuredBotUrl(value = import.meta.env.VITE_TELEGRAM_BOT_URL): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "t.me" && !url.username && !url.password && !url.port && !url.hash
      && /^\/[a-zA-Z0-9_]{5,32}$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}

/** Adding an admin for Clan discovery must never carry a Network registration payload. */
export function clanAddBotUrl(value = import.meta.env.VITE_TELEGRAM_BOT_URL): string | null {
  const configured = configuredBotUrl(value);
  if (!configured) return null;
  const url = new URL(configured);
  url.search = "";
  url.searchParams.set("startgroup", "");
  url.searchParams.set("admin", "invite_users");
  return url.href;
}
