import { afterEach, describe, expect, it, vi } from "vitest";
import { createTelegramAdapter } from "./adapter";

describe("Telegram adapter", () => {
  afterEach(() => {
    delete window.Telegram;
    vi.restoreAllMocks();
  });

  it("falls back to browser mode when the Telegram script has no launch context", () => {
    window.Telegram = { WebApp: { colorScheme: "dark", themeParams: {} } };
    const adapter = createTelegramAdapter();
    expect(adapter.isTelegram).toBe(false);
    expect(adapter.platform).toBe("browser");
  });

  it("uses Telegram capabilities when init data is available", () => {
    const ready = vi.fn();
    window.Telegram = {
      WebApp: {
        initData: "query_id=test",
        initDataUnsafe: { user: { id: 1, first_name: "Dexo", username: "dexo" } },
        ready,
        platform: "android",
        colorScheme: "dark",
        themeParams: {},
      },
    };

    const adapter = createTelegramAdapter();
    adapter.ready();

    expect(adapter.isTelegram).toBe(true);
    expect(adapter.platform).toBe("telegram");
    expect(adapter.getClientPlatform()).toBe("android");
    expect(adapter.isMobileClient()).toBe(true);
    expect(adapter.getIsFullscreen()).toBe(false);
    expect(adapter.getUser()?.username).toBe("dexo");
    expect(ready).toHaveBeenCalledOnce();
  });

  it("normalizes Telegram safe area values", () => {
    window.Telegram = {
      WebApp: {
        initData: "query_id=test",
        safeAreaInset: { top: 10, right: 2, bottom: 14, left: 2 },
        contentSafeAreaInset: { top: 18, bottom: 20 },
      },
    };

    const adapter = createTelegramAdapter();
    expect(adapter.getInsets()).toEqual({
      safeArea: { top: 10, right: 2, bottom: 14, left: 2 },
      contentSafeArea: { top: 18, right: 0, bottom: 20, left: 0 },
    });
  });

  it("exposes fullscreen controls without forcing them", () => {
    const requestFullscreen = vi.fn();
    const exitFullscreen = vi.fn();
    window.Telegram = {
      WebApp: {
        initData: "query_id=test",
        platform: "tdesktop",
        isFullscreen: true,
        requestFullscreen,
        exitFullscreen,
      },
    };

    const adapter = createTelegramAdapter();
    expect(adapter.isMobileClient()).toBe(false);
    expect(adapter.getIsFullscreen()).toBe(true);

    adapter.requestFullscreen();
    adapter.exitFullscreen();

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(exitFullscreen).toHaveBeenCalledOnce();
  });

});
