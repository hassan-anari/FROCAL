import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createTelegramAdapter, type TelegramAdapter, type TelegramInsets } from "./adapter";
import { launchStatus, readLaunchContext, type LaunchStatus } from "./launch";
import type { TelegramThemeParams } from "./types";

interface TelegramContextValue {
  adapter: TelegramAdapter;
  launchState: LaunchStatus;
  recoverLaunch: () => void;
  theme: TelegramThemeParams;
  colorScheme: "light" | "dark";
  stableHeight: number;
  insets: TelegramInsets;
  isFullscreen: boolean;
  isMobileClient: boolean;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

function setInsetVariables(prefix: string, inset: TelegramInsets["safeArea"]) {
  const root = document.documentElement;
  root.style.setProperty(`${prefix}-top`, `${inset.top}px`);
  root.style.setProperty(`${prefix}-right`, `${inset.right}px`);
  root.style.setProperty(`${prefix}-bottom`, `${inset.bottom}px`);
  root.style.setProperty(`${prefix}-left`, `${inset.left}px`);
}

function applyTelegramEnvironment(
  adapter: TelegramAdapter,
  theme: TelegramThemeParams,
  colorScheme: "light" | "dark",
  stableHeight: number,
  insets: TelegramInsets,
  isFullscreen: boolean,
  isMobileClient: boolean,
) {
  const root = document.documentElement;
  root.dataset.telegram = colorScheme;
  root.dataset.runtime = adapter.platform;
  root.dataset.telegramPlatform = adapter.getClientPlatform();
  root.dataset.telegramFullscreen = isFullscreen ? "true" : "false";
  root.dataset.telegramMobile = isMobileClient ? "true" : "false";
  root.style.setProperty("--tg-stable-height", `${stableHeight}px`);

  setInsetVariables("--tg-safe-area-inset", insets.safeArea);
  setInsetVariables("--tg-content-safe-area-inset", insets.contentSafeArea);

  const mapping: Array<[keyof TelegramThemeParams, string]> = [
    ["bg_color", "--tg-theme-bg"],
    ["text_color", "--tg-theme-text"],
    ["hint_color", "--tg-theme-hint"],
    ["button_color", "--tg-theme-button"],
    ["button_text_color", "--tg-theme-button-text"],
    ["secondary_bg_color", "--tg-theme-secondary-bg"],
    ["accent_text_color", "--tg-theme-accent"],
    ["bottom_bar_bg_color", "--tg-theme-bottom-bar"],
  ];

  for (const [key, variable] of mapping) {
    const value = theme[key];
    if (value) root.style.setProperty(variable, value);
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);
  const [settled, setSettled] = useState(false);
  const [recovery, setRecovery] = useState(0);
  const adapter = useMemo(() => createTelegramAdapter(), [revision]);
  const launchState = launchStatus(readLaunchContext(), settled);
  const recoverLaunch = () => {
    setRevision((value) => value + 1);
    setSettled(false);
    setRecovery((value) => value + 1);
    if (document.documentElement.dataset.telegramSdk === "failed" && !window.Telegram?.WebApp) {
      const original = document.querySelector<HTMLScriptElement>("script[src^='/vendor/telegram/']");
      if (original) {
        const retry = document.createElement("script");
        retry.src = original.src; retry.integrity = original.integrity; retry.crossOrigin = original.crossOrigin;
        document.documentElement.dataset.telegramSdk = "loading";
        retry.onload = () => { document.documentElement.dataset.telegramSdk = "loaded"; setRevision((value) => value + 1); };
        retry.onerror = () => { document.documentElement.dataset.telegramSdk = "failed"; setRevision((value) => value + 1); };
        document.head.appendChild(retry);
      }
    }
  };

  useEffect(() => {
    let previous = readLaunchContext();
    let previousApp = window.Telegram?.WebApp;
    const refresh = () => {
      const next = readLaunchContext();
      const nextApp = window.Telegram?.WebApp;
      if (next.initData !== previous.initData || next.hasContext !== previous.hasContext
        || next.platform !== previous.platform || next.sdkAvailable !== previous.sdkAvailable
        || next.sdkFailed !== previous.sdkFailed || nextApp !== previousApp) {
        previous = next;
        previousApp = nextApp;
        setRevision((value) => value + 1);
      }
    };
    // Bound startup polling; resume/focus/manual recovery handles later native injection.
    const interval = window.setInterval(refresh, 100);
    const settle = window.setTimeout(() => { refresh(); setSettled(true); }, 1_500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 6_000);
    const resume = () => { refresh(); };
    window.addEventListener("focus", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("hashchange", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(interval); window.clearTimeout(settle); window.clearTimeout(stop);
      window.removeEventListener("focus", resume); window.removeEventListener("pageshow", resume);
      window.removeEventListener("hashchange", resume); document.removeEventListener("visibilitychange", resume);
    };
  }, [recovery]);
  const [theme, setTheme] = useState(() => adapter.getTheme());
  const [colorScheme, setColorScheme] = useState(() => adapter.getColorScheme());
  const [stableHeight, setStableHeight] = useState(() => adapter.getStableHeight());
  const [insets, setInsets] = useState(() => adapter.getInsets());
  const [isFullscreen, setIsFullscreen] = useState(() => adapter.getIsFullscreen());
  const isMobileClient = adapter.isMobileClient();
  const bootstrappedRef = useRef<TelegramAdapter | null>(null);

  // Subscribe before requesting fullscreen so a very fast fullscreenChanged
  // event cannot race the React state. Boot commands run in a layout effect,
  // before the browser exposes the first interactive frame.
  useLayoutEffect(() => {
    const updateTheme = () => {
      setTheme(adapter.getTheme());
      setColorScheme(adapter.getColorScheme());
    };
    const updateViewport = () => setStableHeight(adapter.getStableHeight());
    const updateInsets = () => setInsets(adapter.getInsets());
    const updateFullscreen = () => {
      setIsFullscreen(adapter.getIsFullscreen());
      setStableHeight(adapter.getStableHeight());
      setInsets(adapter.getInsets());
    };

    updateTheme(); updateViewport(); updateInsets(); updateFullscreen();

    const unsubscribers = [
      adapter.subscribe("themeChanged", updateTheme),
      adapter.subscribe("viewportChanged", updateViewport),
      adapter.subscribe("safeAreaChanged", updateInsets),
      adapter.subscribe("contentSafeAreaChanged", updateInsets),
      adapter.subscribe("fullscreenChanged", updateFullscreen),
      adapter.subscribe("fullscreenFailed", updateFullscreen),
    ];

    const onBrowserResize = () => {
      if (!adapter.isTelegram) setStableHeight(adapter.getStableHeight());
    };
    window.addEventListener("resize", onBrowserResize, { passive: true });

    if (bootstrappedRef.current !== adapter) {
      bootstrappedRef.current = adapter;
      adapter.expand();

      // Main Mini Apps can be launched natively in fullscreen. Menu Button
      // launches cannot always declare that presentation mode, so request true
      // fullscreen immediately on Telegram mobile before signalling ready.
      // Desktop is intentionally left in whatever native presentation Telegram
      // chose; CSS bounds and centers the portrait canvas without resizing the
      // Telegram WebView after launch.
      if (
        adapter.isTelegram
        && isMobileClient
        && typeof window.Telegram?.WebApp?.requestFullscreen === "function"
        && !adapter.getIsFullscreen()
        && document.documentElement.dataset.telegramFullscreenRequested !== "true"
      ) {
        document.documentElement.dataset.telegramFullscreenRequested = "true";
        adapter.requestFullscreen();
      }

      adapter.setChromeColors("#03050d", "#03050d", "#03050d");
      adapter.ready();
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      window.removeEventListener("resize", onBrowserResize);
    };
  }, [adapter, isMobileClient]);

  // Keep Telegram runtime attributes, viewport height and safe-area variables
  // synchronized before paint. index.html seeds the same values even earlier
  // so Desktop never gets an initial full-width game frame.
  useLayoutEffect(() => {
    applyTelegramEnvironment(
      adapter,
      theme,
      colorScheme,
      stableHeight,
      insets,
      isFullscreen,
      isMobileClient,
    );
  }, [adapter, theme, colorScheme, stableHeight, insets, isFullscreen, isMobileClient]);

  return (
    <TelegramContext.Provider value={{ adapter, launchState, recoverLaunch, theme, colorScheme, stableHeight, insets, isFullscreen, isMobileClient }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const value = useContext(TelegramContext);
  if (!value) throw new Error("useTelegram must be used inside TelegramProvider");
  return value;
}
