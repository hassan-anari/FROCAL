import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BootstrapProvider, useBootstrap } from "./BootstrapProvider";
import { TelegramProvider, useTelegram } from "@/integrations/telegram/TelegramProvider";
import { useGameplayAvailability } from "./useGameplayAvailability";
import { legacyBootstrap } from "./bootstrapFixture.test-data";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";

function Probe() {
  const { bootstrap, scope, progressionPolicy } = useBootstrap(); const { launchState } = useTelegram();
  const { featureAvailable, canEarn } = useGameplayAvailability();
  return <div><span>{launchState}</span><span>{bootstrap.data?.player.firstName ?? "waiting"}</span><span>{scope.season}</span><span>{useOnboardingStore((state) => state.status)}</span><span data-testid="policy">{progressionPolicy?.levels.length ?? "legacy-policy"}</span><span data-testid="arena-readable">{String(featureAvailable("arena"))}</span><span data-testid="tap-eligible">{String(canEarn("base_tap"))}</span></div>;
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

it("clears prior config caches on checksum turnover and exposes typed policy", async () => {
  const fixture = (await import("./fixtures/bootstrap-b1.json")).default;
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "checksum-session", platform: "tdesktop" } };
  let changed = false;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ...fixture, config: { ...fixture.config, payload_checksum: changed ? "b".repeat(64) : fixture.config.payload_checksum } })))));
  const client = mount(); await screen.findByText("Verified");
  expect(screen.getByTestId("policy")).toHaveTextContent(String(fixture.config.progression.levels.length));
  const configScope = JSON.stringify([fixture.config.version, fixture.config.schema_version, fixture.config.payload_checksum]);
  const oldKey = ["player", 1, "42", "season-1", configScope, "profile", "overview"];
  client.setQueryData(oldKey, { level: 90 });
  changed = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ["bootstrap"] }); });
  await waitFor(() => expect(client.getQueryData(oldKey)).toBeUndefined());
});


it("separates read availability from server reward eligibility without treating FLAGGED as banned", async () => {
  const fixture = (await import("./fixtures/bootstrap-b1.json")).default;
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "eligibility-session", platform: "android" } };
  let allowed = false;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ...fixture, gameplay: { moderation_state: "FLAGGED", reward_earning_allowed: allowed } })))));
  const client = mount(); await screen.findByText("Verified");
  expect(screen.getByTestId("arena-readable")).toHaveTextContent("true");
  expect(screen.getByTestId("tap-eligible")).toHaveTextContent("false");
  allowed = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ["bootstrap"] }); });
  await waitFor(() => expect(screen.getByTestId("tap-eligible")).toHaveTextContent("true"));
});

it("retains pinned timing through canonical merges, config turnover and audited gate refresh", async () => {
  const fixture = (await import("./fixtures/phase4/registered-2.json")).default;
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "timing-session", platform: "android" } };
  let changed = false;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ...fixture,
    config: { ...fixture.config, version: changed ? "prospective-tuning" : fixture.config.version },
    season: { ...fixture.season, timing: { ...fixture.season.timing, settlement_start_epoch: changed ? 2 : 1 } },
  })))));
  const client = mount(); await screen.findByText("Dexo");
  const key = ["bootstrap", 1, "remote", "new-user", "telegram"];
  // Use the actual mounted key so platform/scenario selection remains production-owned.
  const mounted = client.getQueryCache().findAll({ queryKey: ["bootstrap"] })[0].queryKey;
  const { commitCanonical } = await import("./canonical");
  const { configCacheScope } = await import("./bootstrapContract");
  const scope = { session: 1, player: fixture.player.id, season: fixture.season.code, config: configCacheScope(fixture.config) };
  act(() => { commitCanonical(client, scope, { ...fixture.canonical, receipt_cursor: 10, season_points: 12, progression: { ...fixture.progression, dexo_stage: "newborn" } }); });
  expect(client.getQueryData(mounted)).toMatchObject({ remote: { season: { timing: fixture.season.timing }, gameplay: { reward_earning_allowed: false } } });
  await act(async () => { await client.invalidateQueries({ queryKey: ["bootstrap"] }); });
  expect(client.getQueryData(mounted)).toMatchObject({ remote: { canonical: { receipt_cursor: 10 }, season: { timing: fixture.season.timing } } });
  changed = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ["bootstrap"] }); });
  expect(client.getQueryData(mounted)).toMatchObject({ remote: { config: { version: "prospective-tuning" }, season: { starts_at: fixture.season.starts_at, ends_at: fixture.season.ends_at, timing: { ...fixture.season.timing, settlement_start_epoch: 2 } } } });
  expect(client.getQueryData(key)).toBeDefined();
});

it("pauses earning on background resume until fresh backend authority arrives, then retains denial", async () => {
  const fixture = (await import("./fixtures/bootstrap-b1.json")).default;
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "resume-session", platform: "android" } };
  let finish!: (value: Response) => void;
  let delayed = false;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => delayed
    ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(new Response(JSON.stringify(fixture)))));
  mount(); await screen.findByText("Verified");
  expect(screen.getByTestId("tap-eligible")).toHaveTextContent("true");
  delayed = true;
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
  expect(screen.getByTestId("tap-eligible")).toHaveTextContent("false");
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  await act(async () => { finish(new Response(JSON.stringify({ ...fixture, gameplay: { moderation_state: "ACTIVE", reward_earning_allowed: false } }))); });
  await waitFor(() => expect(screen.getByTestId("tap-eligible")).toHaveTextContent("false"));
  expect(screen.getByTestId("arena-readable")).toHaveTextContent("true");
});

it("does not let an older Bootstrap grant overwrite a newer server denial", async () => {
  const fixture = (await import("./fixtures/bootstrap-b1.json")).default;
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "ordered-authority", platform: "android" } };
  let stale = false;
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ ...fixture,
    server_time: stale ? "2026-10-13T12:00:00Z" : fixture.server_time,
    gameplay: { moderation_state: "ACTIVE", reward_earning_allowed: stale },
  })))));
  const client = mount(); await screen.findByText("Verified");
  expect(screen.getByTestId("tap-eligible")).toHaveTextContent("false");
  stale = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ["bootstrap"] }); });
  expect(screen.getByTestId("tap-eligible")).toHaveTextContent("false");
});

it("replaces timing on player and Season turnover without copying an earlier topology", async () => {
  const two = (await import("./fixtures/phase4/registered-2.json")).default;
  const six = (await import("./fixtures/phase4/registered-6.json")).default;
  vi.stubEnv("VITE_DATA_SOURCE", "remote");
  window.Telegram = { WebApp: { initData: "timing-first", platform: "android" } };
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url, options: RequestInit) => {
    const second = new Headers(options.headers).get("Authorization") === "tma timing-second";
    return Promise.resolve(new Response(JSON.stringify(second ? { ...six, player: { ...six.player, id: "940002", telegram_user_id: 940002, first_name: "Next" }, season: { ...six.season, code: "next-season" }, canonical: { ...six.canonical, player_id: "940002", season_id: "next-season" } } : two)));
  }));
  const client = mount(); await screen.findByText("Dexo");
  expect(client.getQueryCache().findAll({ queryKey: ["bootstrap"] })[0].state.data).toMatchObject({ remote: { season: { timing: two.season.timing } } });
  act(() => { window.Telegram!.WebApp!.initData = "timing-second"; });
  await screen.findByText("Next");
  await waitFor(() => expect(client.getQueryCache().findAll({ queryKey: ["bootstrap", 1] })).toHaveLength(0));
  expect(client.getQueryCache().findAll({ queryKey: ["bootstrap", 2] })[0].state.data).toMatchObject({ remote: { season: { timing: six.season.timing } } });
});
