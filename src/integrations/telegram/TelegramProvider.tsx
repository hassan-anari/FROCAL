import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createTelegramAdapter, type TelegramAdapter } from "./adapter";
import type { TelegramThemeParams } from "./types";

interface TelegramContextValue {
  adapter: TelegramAdapter;
  theme: TelegramThemeParams;
  colorScheme: "light" | "dark";
  stableHeight: number;
}

const TelegramContext = createContext<TelegramContextValue | null>(null);

function applyTheme(theme: TelegramThemeParams, colorScheme: "light" | "dark", stableHeight: number) {
  const root = document.documentElement;
  root.dataset.telegram = colorScheme;
  root.style.setProperty("--tg-stable-height", `${stableHeight}px`);

  const mapping: Array<[keyof TelegramThemeParams, string]> = [
    ["bg_color", "--tg-theme-bg"],
    ["text_color", "--tg-theme-text"],
    ["hint_color", "--tg-theme-hint"],
    ["button_color", "--tg-theme-button"],
    ["button_text_color", "--tg-theme-button-text"],
    ["secondary_bg_color", "--tg-theme-secondary-bg"],
    ["accent_text_color", "--tg-theme-accent"],
  ];

  for (const [key, variable] of mapping) {
    const value = theme[key];
    if (value) root.style.setProperty(variable, value);
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createTelegramAdapter(), []);
  const [theme, setTheme] = useState(() => adapter.getTheme());
  const [colorScheme, setColorScheme] = useState(() => adapter.getColorScheme());
  const [stableHeight, setStableHeight] = useState(() => adapter.getStableHeight());

  useEffect(() => {
    const updateTheme = () => {
      setTheme(adapter.getTheme());
      setColorScheme(adapter.getColorScheme());
    };
    const updateViewport = () => setStableHeight(adapter.getStableHeight());

    const unsubscribeTheme = adapter.subscribe("themeChanged", updateTheme);
    const unsubscribeViewport = adapter.subscribe("viewportChanged", updateViewport);

    adapter.ready();
    adapter.expand();
    adapter.setChromeColors("#050914", "#050914");

    return () => {
      unsubscribeTheme();
      unsubscribeViewport();
    };
  }, [adapter]);

  useEffect(() => {
    applyTheme(theme, colorScheme, stableHeight);
  }, [theme, colorScheme, stableHeight]);

  return (
    <TelegramContext.Provider value={{ adapter, theme, colorScheme, stableHeight }}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegram() {
  const value = useContext(TelegramContext);
  if (!value) throw new Error("useTelegram must be used inside TelegramProvider");
  return value;
}
