import { afterEach, expect, it } from "vitest";
import { launchStatus, readLaunchContext } from "./launch";
import { createTelegramAdapter } from "./adapter";

afterEach(() => { delete window.Telegram; sessionStorage.clear(); history.replaceState({}, "", "/"); delete document.documentElement.dataset.telegramSdk; });
it("recovers official raw hash LaunchParams with the SDK missing", () => {
  const raw = 'user=%7B%22id%22%3A42%7D&auth_date=123&hash=signature';
  history.replaceState({}, "", `/#tgWebAppData=${encodeURIComponent(raw)}&tgWebAppPlatform=android&tgWebAppVersion=8.0`);
  document.documentElement.dataset.telegramSdk = "failed";
  expect(readLaunchContext()).toMatchObject({ initData: raw, hasContext: true, sdkAvailable: false });
  expect(launchStatus(readLaunchContext(), true)).toBe("ready");
  expect(createTelegramAdapter().isTelegram).toBe(true);
});
it.each(["android", "ios", "tdesktop", "macos", "web"])("supports official %s clients without depending on unsigned user data", (platform) => {
  history.replaceState({}, "", `/#route?tgWebAppPlatform=${platform}&tgWebAppStartParam=ref_123`);
  const adapter = createTelegramAdapter();
  expect(adapter.isTelegram).toBe(true); expect(adapter.getClientPlatform()).toBe(platform);
  expect(adapter.isMobileClient()).toBe(["android", "ios"].includes(platform));
  expect(adapter.getInitData()).toBeNull(); expect(adapter.getStartParam()).toBe("ref_123");
});
it("does not treat an SDK global alone or unsigned user as Telegram authentication", () => {
  window.Telegram = { WebApp: { initDataUnsafe: { user: { id: 9, first_name: "Untrusted" } } } };
  expect(launchStatus(readLaunchContext(), true)).toBe("browser");
  expect(createTelegramAdapter().getInitData()).toBeNull();
});
it("keeps a hinted launch distinct from a browser when credentials are delayed or missing", () => {
  history.replaceState({}, "", "/#tgWebAppPlatform=ios");
  expect(launchStatus(readLaunchContext(), false)).toBe("initializing");
  expect(launchStatus(readLaunchContext(), true)).toBe("data-missing");
  document.documentElement.dataset.telegramSdk = "failed";
  expect(launchStatus(readLaunchContext(), true)).toBe("sdk-failed");
  window.Telegram = { WebApp: { initData: "raw-signed-data", platform: "ios" } };
  expect(launchStatus(readLaunchContext(), true)).toBe("ready");
});
it("uses official same-tab storage on refresh but gives new launch data precedence", () => {
  sessionStorage.setItem("__telegram__initParams", JSON.stringify({ tgWebAppData: "old", tgWebAppPlatform: "ios" }));
  expect(readLaunchContext().initData).toBe("old");
  history.replaceState({}, "", "/#tgWebAppData=new&tgWebAppPlatform=tdesktop");
  expect(readLaunchContext()).toMatchObject({ initData: "new", platform: "tdesktop" });
});
it("handles malformed launch storage without inventing credentials", () => {
  sessionStorage.setItem("__telegram__initParams", "bad-json");
  expect(readLaunchContext().initData).toBeNull();
  expect(launchStatus(readLaunchContext(), true)).toBe("browser");
});
it("retains recovered raw LaunchParams across client navigation without the SDK", () => {
  history.replaceState({}, "", "/profile#tgWebAppData=signed-launch&tgWebAppPlatform=ios");
  expect(readLaunchContext().initData).toBe("signed-launch");
  history.replaceState({}, "", "/earn");
  expect(readLaunchContext().initData).toBe("signed-launch");
});
it("recognizes a native bridge hint when the SDK and launch data are missing, without authenticating", () => {
  const nativeWindow = window as Window & { TelegramWebviewProxy?: { postEvent: () => void } };
  nativeWindow.TelegramWebviewProxy = { postEvent: () => undefined };
  document.documentElement.dataset.telegramSdk = "failed";
  expect(launchStatus(readLaunchContext(), true)).toBe("sdk-failed");
  expect(createTelegramAdapter().getInitData()).toBeNull();
  delete nativeWindow.TelegramWebviewProxy;
});
