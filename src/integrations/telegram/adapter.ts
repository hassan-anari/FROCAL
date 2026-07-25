import type { TelegramThemeParams, TelegramUser, TelegramWebAppLike } from "./types";

export type HapticImpact = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotice = "error" | "success" | "warning";

export interface TelegramAdapter {
  readonly isTelegram: boolean;
  readonly platform: "telegram" | "browser";
  getUser(): TelegramUser | null;
  getTheme(): TelegramThemeParams;
  getColorScheme(): "light" | "dark";
  getStableHeight(): number;
  ready(): void;
  expand(): void;
  hapticImpact(style?: HapticImpact): void;
  hapticNotice(type: HapticNotice): void;
  selectionChanged(): void;
  openTelegramLink(url: string): void;
  openExternalLink(url: string): void;
  setChromeColors(background: string, header?: string): void;
  showBackButton(handler: () => void): () => void;
  subscribe(event: "themeChanged" | "viewportChanged", handler: () => void): () => void;
}

function getTelegramWebApp(): TelegramWebAppLike | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function createTelegramAdapter(): TelegramAdapter {
  const app = getTelegramWebApp();
  const isTelegram = Boolean(app);

  return {
    isTelegram,
    platform: isTelegram ? "telegram" : "browser",
    getUser: () => app?.initDataUnsafe?.user ?? null,
    getTheme: () => app?.themeParams ?? {},
    getColorScheme: () => app?.colorScheme ?? "dark",
    getStableHeight: () => app?.viewportStableHeight ?? app?.viewportHeight ?? (typeof window === "undefined" ? 0 : window.innerHeight),
    ready: () => app?.ready?.(),
    expand: () => app?.expand?.(),
    hapticImpact: (style = "light") => app?.HapticFeedback?.impactOccurred(style),
    hapticNotice: (type) => app?.HapticFeedback?.notificationOccurred(type),
    selectionChanged: () => app?.HapticFeedback?.selectionChanged(),
    openTelegramLink: (url) => {
      if (app?.openTelegramLink) app.openTelegramLink(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    },
    openExternalLink: (url) => {
      if (app?.openLink) app.openLink(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    },
    setChromeColors: (background, header = background) => {
      app?.setBackgroundColor?.(background);
      app?.setHeaderColor?.(header);
    },
    showBackButton: (handler) => {
      if (!app?.BackButton) return () => undefined;
      app.BackButton.show();
      app.BackButton.onClick(handler);
      return () => {
        app.BackButton?.offClick(handler);
        app.BackButton?.hide();
      };
    },
    subscribe: (event, handler) => {
      app?.onEvent?.(event, handler);
      return () => app?.offEvent?.(event, handler);
    },
  };
}
