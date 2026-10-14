import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BootstrapProvider, useBootstrap } from "./BootstrapProvider";
import { TelegramProvider, useTelegram } from "@/integrations/telegram/TelegramProvider";
import { legacyBootstrap } from "./bootstrapFixture.test-data";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";

function Probe() {
  const { bootstrap, scope } = useBootstrap(); const { launchState } = useTelegram();
  return <div><span>{launchState}</span><span>{bootstrap.data?.player.firstName ?? "waiting"}</span><span>{scope.season}</span><span>{useOnboardingStore((state) => state.status)}</span></div>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><TelegramProvider><BootstrapProvider><Probe /></BootstrapProvider></TelegramProvider></QueryClientProvider>);
  return client;
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); delete window.Telegram; sessionStorage.clear(); localStorage.clear(); history.replaceState({}, "", "/"); useOnboardingStore.persist.setOptions({ name: "dalexio-onboarding-v1" }); });
it("recovers late SDK credentials and authenticates the single shared Bootstrap", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(legacyBootstrap)));
  vi.stubGlobal("fetch", fetchMock); mount();
  expect(fetchMock).not.toHaveBeenCalled();
  act(() => { window.Telegram = { WebApp: { initData: "delayed-signed", platform: "ios" } }; });
  await screen.findByText("Verified");
  expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe("tma delayed-signed");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("replaces player and Season data on credential changes without carrying completed onboarding", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "player-one", platform: "android" } };
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options: RequestInit) => {
    const second = new Headers(options.headers).get("Authorization") === "tma player-two";
    return Promise.resolve(new Response(JSON.stringify(second ? { ...legacyBootstrap, player: { ...legacyBootstrap.player, telegram_user_id: 99, first_name: "Second" }, season: { ...legacyBootstrap.season, code: "season-2" } } : legacyBootstrap)));
  }));
  const client = mount(); await screen.findByText("Verified");
  act(() => useOnboardingStore.getState().complete());
  expect(screen.getByText("completed")).toBeVisible();
  act(() => { window.Telegram!.WebApp!.initData = "player-two"; });
  await screen.findByText("Second"); expect(screen.queryByText("Verified")).toBeNull();
  expect(screen.getByText("season-2")).toBeVisible(); expect(screen.getByText("not-started")).toBeVisible();
  await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ["bootstrap", 1] })).toHaveLength(0));
});
it("restores onboarding after a fresh authenticated refresh for the same validated player", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "fresh-signed", platform: "tdesktop" } };
  localStorage.setItem("dalexio-onboarding-v1:player:42", JSON.stringify({ state: { status: "completed", step: "ready", guideIndex: 3, completedAt: "2026-10-14T00:00:00Z" }, version: 1 }));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(legacyBootstrap))));
  mount(); await screen.findByText("Verified"); expect(screen.getByText("completed")).toBeVisible();
});
it("invalidates prior Season/config caches when a same-credential Bootstrap refresh changes scope", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "same-session", platform: "tdesktop" } };
  let changed = false;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(changed ? { ...legacyBootstrap, season: { ...legacyBootstrap.season, code: "season-2" }, config: { ...legacyBootstrap.config, version: "v2" } } : legacyBootstrap)))));
  const client = mount(); await screen.findByText("Verified");
  client.setQueryData(["player", 1, "42", "season-1", "legacy-v1", "profile", "overview"], { level: 90 });
  changed = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ["bootstrap"] }); });
  await screen.findByText("season-2");
  await waitFor(() => expect(client.getQueryData(["player", 1, "42", "season-1", "legacy-v1", "profile", "overview"])).toBeUndefined());
});
it("does not consume fullscreen initialization before a delayed SDK provides the capability", async () => {
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  history.replaceState({}, "", "/#tgWebAppData=launch-signed&tgWebAppPlatform=android");
  delete document.documentElement.dataset.telegramFullscreenRequested;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(legacyBootstrap))));
  mount(); await screen.findByText("Verified");
  expect(document.documentElement.dataset.telegramFullscreenRequested).toBeUndefined();
  const fullscreen = vi.fn();
  act(() => { window.Telegram = { WebApp: { initData: "launch-signed", platform: "android", requestFullscreen: fullscreen } }; });
  await waitFor(() => expect(fullscreen).toHaveBeenCalledTimes(1));
  delete document.documentElement.dataset.telegramFullscreenRequested;
});
