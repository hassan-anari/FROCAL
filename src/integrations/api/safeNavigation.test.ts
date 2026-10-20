import { expect, it, vi } from "vitest";
import { navigateSafely, safeDestination } from "./safeNavigation";

it.each([null, "", "javascript:alert(1)", "data:text/html,evil", "//evil.test", "http://insecure.test", "https://user:pass@example.test", " https://t.me/bot", "https://t.me/bot\n", "https://t.me/%0aevil", "/diagnostics", "/onboarding", "https:\\evil.test", "/earn?debug=1"])("rejects unsafe or unapproved destinations without navigation: %s", value => {
  const adapter = { openTelegramLink: vi.fn(), openExternalLink: vi.fn() }; const navigate = vi.fn();
  expect(navigateSafely(value, adapter, navigate)).toBe(false);
  expect(adapter.openTelegramLink).not.toHaveBeenCalled(); expect(adapter.openExternalLink).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
});
it("uses exact host matching for Telegram and keeps HTTPS external destinations separate", () => {
  expect(safeDestination("https://t.me/DalexioBot?start=opaque")).toMatchObject({ kind: "telegram" });
  expect(safeDestination("https://t.me.evil.test/DalexioBot")).toMatchObject({ kind: "external" });
  expect(safeDestination("https://example.test/t.me/DalexioBot")).toMatchObject({ kind: "external" });
  expect(safeDestination("/earn/typing")).toEqual({ kind: "internal", path: "/earn/typing" });
});
it("routes validated URLs through existing Telegram/external adapters and internal navigation", () => {
  const adapter = { openTelegramLink: vi.fn(), openExternalLink: vi.fn() }; const navigate = vi.fn();
  navigateSafely("https://t.me/DalexioBot?start=opaque", adapter, navigate);
  navigateSafely("https://dalexio.com/season", adapter, navigate);
  navigateSafely("/earn", adapter, navigate);
  expect(adapter.openTelegramLink).toHaveBeenCalledWith("https://t.me/DalexioBot?start=opaque");
  expect(adapter.openExternalLink).toHaveBeenCalledWith("https://dalexio.com/season");
  expect(navigate).toHaveBeenCalledWith("/earn");
});

it.each([
  "https://partner.example.org/campaign?utm_source=telegram&next=%2Foffer%3Fa%3D1#details",
  "https://another-domain.example.net/offer?q=hello%20world&campaign=a%26b",
])("preserves approved external domains and query strings: %s", value => {
  const adapter = { openTelegramLink: vi.fn(), openExternalLink: vi.fn() }; const navigate = vi.fn();
  expect(navigateSafely(value, adapter, navigate)).toBe(true);
  expect(adapter.openExternalLink).toHaveBeenCalledWith(value);
  expect(adapter.openTelegramLink).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
});
it.each(["https://evil.test:444/path", "https://good.test@evil.test/", "https://evil.test/%0d%0aLocation:bad", "https://evil.test/\\x", "https://evil.test/\u0000", "//evil.test/path", "http://evil.test/path"])("retains strict external URL rejection: %s", value => {
  expect(safeDestination(value)).toBeNull();
});
it("reports Telegram navigation failures without claiming that the destination opened", () => {
  const navigate = vi.fn();
  for (const openTelegramLink of [vi.fn(() => false), vi.fn(() => { throw new Error("Native unavailable"); })]) {
    expect(navigateSafely("https://t.me/reviewed_channel", { openTelegramLink, openExternalLink: vi.fn() }, navigate)).toBe(false);
  }
  expect(navigate).not.toHaveBeenCalled();
});
