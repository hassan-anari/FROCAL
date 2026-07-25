import { afterEach, describe, expect, it, vi } from "vitest";
import { createTelegramAdapter } from "./adapter";

describe("Telegram adapter", () => {
  afterEach(() => {
    delete window.Telegram;
    vi.restoreAllMocks();
  });

  it("falls back to browser mode", () => {
    const adapter = createTelegramAdapter();
    expect(adapter.isTelegram).toBe(false);
    expect(adapter.platform).toBe("browser");
  });

  it("uses Telegram capabilities when available", () => {
    const ready = vi.fn();
    window.Telegram = { WebApp: { ready, colorScheme: "dark", themeParams: {} } };
    const adapter = createTelegramAdapter();
    adapter.ready();
    expect(adapter.isTelegram).toBe(true);
    expect(ready).toHaveBeenCalledOnce();
  });
});
