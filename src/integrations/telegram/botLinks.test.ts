import { expect, it, vi, afterEach } from "vitest";
import { configuredBotUrl, clanAddBotUrl } from "./botLinks";
afterEach(() => vi.unstubAllEnvs());
it.each(["DalexioTestBot", "DalexioBot"])("uses the configured %s without carrying a registration payload into Clan", bot => {
  vi.stubEnv("VITE_TELEGRAM_BOT_URL", `https://t.me/${bot}?start=public-launch&startgroup=signed-network-intent`);
  expect(configuredBotUrl()).toContain(`/${bot}?start=public-launch`);
  const clan = new URL(clanAddBotUrl()!);
  expect(clan.pathname).toBe(`/${bot}`); expect(clan.searchParams.get("startgroup")).toBe("");
  expect(clan.searchParams.get("admin")).toBe("invite_users"); expect(clan.searchParams.has("start")).toBe(false);
  expect(clan.href).not.toContain("network-intent");
});
it.each(["", "http://t.me/TestBot", "https://t.me.evil.test/TestBot", "https://user:pass@t.me/TestBot", "https://t.me/share/url", "not a url", "https://t.me/TestBot#token"])("fails closed for invalid config %s", value => {
  expect(configuredBotUrl(value)).toBeNull(); expect(clanAddBotUrl(value)).toBeNull();
});
