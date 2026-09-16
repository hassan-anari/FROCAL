import type {
  TelegramEvent,
  TelegramSafeAreaInset,
  TelegramThemeParams,
  TelegramUser,
  TelegramWebAppLike,
} from "./types";

export type HapticImpact = "light" | "medium" | "heavy" | "rigid" | "soft";
export type HapticNotice = "error" | "success" | "warning";

export interface TelegramInsets {
  safeArea: Required<TelegramSafeAreaInset>;
  contentSafeArea: Required<TelegramSafeAreaInset>;
}

export interface TelegramAdapter {
  readonly isTelegram: boolean;
  readonly platform: "telegram" | "browser";
  getClientPlatform(): string;
  isMobileClient(): boolean;
  getIsFullscreen(): boolean;
  getInitData(): string | null;
  getUser(): TelegramUser | null;
  getStartParam(): string | null;
  getTheme(): TelegramThemeParams;
  getColorScheme(): "light" | "dark";
  getStableHeight(): number;
  getInsets(): TelegramInsets;
  ready(): void;
  expand(): void;
  requestFullscreen(): void;
  exitFullscreen(): void;
  disableVerticalSwipes(): void;
  enableVerticalSwipes(): void;
  hapticImpact(style?: HapticImpact): void;
  hapticNotice(type: HapticNotice): void;
  selectionChanged(): void;
  openTelegramLink(url: string): void;
  openExternalLink(url: string): void;
  setChromeColors(background: string, header?: string, bottomBar?: string): void;
  showBackButton(handler: () => void): () => void;
  subscribe(event: TelegramEvent, handler: () => void): () => void;
}

const zeroInset = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

function normalizeInset(value?: TelegramSafeAreaInset): Required<TelegramSafeAreaInset> {
  return {
    top: Math.max(0, value?.top ?? 0),
    right: Math.max(0, value?.right ?? 0),
    bottom: Math.max(0, value?.bottom ?? 0),
    left: Math.max(0, value?.left ?? 0),
  };
}

function isMobileTelegramPlatform(platform?: string): boolean {
  const value = platform?.trim().toLowerCase() ?? "";
  return value === "ios" || value === "android" || value.startsWith("android_");
}

function scheduleNativeFeedback(callback: () => void): void {
  if (typeof window === "undefined") {
    callback();
    return;
  }
  window.requestAnimationFrame(() => callback());
}

function getTelegramWebApp(): TelegramWebAppLike | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

function hasTelegramLaunchContext(app: TelegramWebAppLike | null): app is TelegramWebAppLike {
  if (!app) return false;
  return Boolean(
    app.initData?.trim()
    || app.initDataUnsafe?.user
    || app.initDataUnsafe?.start_param,
  );
}

export function createTelegramAdapter(): TelegramAdapter {
  const rawApp = getTelegramWebApp();
  const app = hasTelegramLaunchContext(rawApp) ? rawApp : null;
  const isTelegram = app !== null;

  return {
    isTelegram,
    platform: isTelegram ? "telegram" : "browser",
    getClientPlatform: () => (isTelegram ? app?.platform ?? "unknown" : "browser"),
    isMobileClient: () => isTelegram && isMobileTelegramPlatform(app?.platform),
    getIsFullscreen: () => Boolean(isTelegram && app?.isFullscreen),
    getInitData: () => {
      const initData = isTelegram ? app?.initData?.trim() : "";
      return initData || null;
    },
    getUser: () => (isTelegram ? app?.initDataUnsafe?.user ?? null : null),
    getStartParam: () => (isTelegram ? app?.initDataUnsafe?.start_param ?? null : null),
    getTheme: () => (isTelegram ? app?.themeParams ?? {} : {}),
    getColorScheme: () => (isTelegram ? app?.colorScheme ?? "dark" : "dark"),
    getStableHeight: () => {
      const telegramHeight = isTelegram ? app?.viewportStableHeight ?? app?.viewportHeight : undefined;
      const browserHeight = typeof window === "undefined" ? 0 : window.innerHeight;
      return Math.max(1, telegramHeight ?? browserHeight);
    },
    getInsets: () => ({
      safeArea: isTelegram ? normalizeInset(app?.safeAreaInset) : { ...zeroInset },
      contentSafeArea: isTelegram ? normalizeInset(app?.contentSafeAreaInset) : { ...zeroInset },
    }),
    ready: () => {
      if (isTelegram) app?.ready?.();
    },
    expand: () => {
      if (isTelegram) app?.expand?.();
    },
    requestFullscreen: () => {
      if (isTelegram) app?.requestFullscreen?.();
    },
    exitFullscreen: () => {
      if (isTelegram) app?.exitFullscreen?.();
    },
    disableVerticalSwipes: () => {
      if (isTelegram) app?.disableVerticalSwipes?.();
    },
    enableVerticalSwipes: () => {
      if (isTelegram) app?.enableVerticalSwipes?.();
    },
    hapticImpact: (style = "light") => {
      if (isTelegram) scheduleNativeFeedback(() => app?.HapticFeedback?.impactOccurred(style));
    },
    hapticNotice: (type) => {
      if (isTelegram) scheduleNativeFeedback(() => app?.HapticFeedback?.notificationOccurred(type));
    },
    selectionChanged: () => {
      if (isTelegram) scheduleNativeFeedback(() => app?.HapticFeedback?.selectionChanged());
    },
    openTelegramLink: (url) => {
      if (isTelegram && app?.openTelegramLink) app.openTelegramLink(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    },
    openExternalLink: (url) => {
      if (isTelegram && app?.openLink) app.openLink(url);
      else window.open(url, "_blank", "noopener,noreferrer");
    },
    setChromeColors: (background, header = background, bottomBar = background) => {
      if (!isTelegram) return;
      app?.setBackgroundColor?.(background);
      app?.setHeaderColor?.(header);
      app?.setBottomBarColor?.(bottomBar);
    },
    showBackButton: (handler) => {
      if (!isTelegram || !app?.BackButton) return () => undefined;
      app.BackButton.show();
      app.BackButton.onClick(handler);
      return () => {
        app?.BackButton?.offClick(handler);
        app?.BackButton?.hide();
      };
    },
    subscribe: (event, handler) => {
      if (!isTelegram) return () => undefined;
      app?.onEvent?.(event, handler);
      return () => app?.offEvent?.(event, handler);
    },
  };
}
