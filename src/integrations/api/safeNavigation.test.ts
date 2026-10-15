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
