/** Launch hints select UX/capabilities. ONLY server-verified raw initData authenticates. */
export interface LaunchContext {
  initData: string | null;
  hasContext: boolean;
  sdkAvailable: boolean;
  sdkFailed: boolean;
  platform: string;
  startParam: string | null;
}

let ignoredCachedInitData: string | null = null;

function readParams(): Record<string, string> {
  // Match Telegram's official hash format, including #path?tgWebAppData=… .
  const hash = window.location.hash.slice(1);
  const params = new URLSearchParams(hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : hash);
  const current = Object.fromEntries([...params].filter(([key]) => key.startsWith("tgWebApp")));
  // Some launch surfaces provide the same official fields in the query string.
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (key.startsWith("tgWebApp") && !(key in current)) current[key] = value;
  }
  // A new launch must take precedence over the previous account's same-tab data.
  if (Object.keys(current).length) {
    if ("tgWebAppData" in current) ignoredCachedInitData = null;
    else {
      // The official SDK can merge old same-tab data into a new incomplete launch.
      // A prior account's signed credential must not authenticate that new launch.
      try {
        const previous = JSON.parse(sessionStorage.getItem("__telegram__initParams") ?? "null");
        if (typeof previous?.tgWebAppData === "string") ignoredCachedInitData = previous.tgWebAppData;
      } catch { /* no usable prior credential */ }
    }
    // Same-tab recovery mirrors the official SDK. Never put credentials in localStorage.
    // Replace rather than merge a new launch to avoid inheriting another account's data.
    try { const serialized = JSON.stringify(current); if (sessionStorage.getItem("__telegram__initParams") !== serialized) sessionStorage.setItem("__telegram__initParams", serialized); } catch { /* storage may be disabled */ }
    return current;
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem("__telegram__initParams") ?? "null");
    if (stored && typeof stored === "object") {
      return Object.fromEntries(Object.entries(stored).filter(([key, value]) => key.startsWith("tgWebApp") && typeof value === "string")) as Record<string, string>;
    }
  } catch { /* blocked storage or malformed cache is not proof of a browser */ }
  return {};
}

export function readLaunchContext(): LaunchContext {
  const params = readParams();
  const app = window.Telegram?.WebApp;
  // Explicit launch data beats any SDK snapshot left from an earlier launch.
  const sdkInitData = app?.initData === ignoredCachedInitData ? null : app?.initData;
  const initData = (params.tgWebAppData ?? sdkInitData ?? "").trim() || null;
  const platform = params.tgWebAppPlatform ?? app?.platform ?? "unknown";
  const nativeWindow = window as Window & { TelegramWebviewProxy?: { postEvent?: unknown }; external?: External & { notify?: unknown } };
  const nativeBridge = typeof nativeWindow.TelegramWebviewProxy?.postEvent === "function"
    || typeof nativeWindow.external?.notify === "function";
  const hasContext = Boolean(initData || Object.keys(params).length || nativeBridge || (platform !== "unknown" && platform !== "browser"));
  return {
    initData,
    hasContext,
    platform: hasContext ? platform : "browser",
    sdkAvailable: Boolean(app),
    sdkFailed: document.documentElement.dataset.telegramSdk === "failed",
    startParam: params.tgWebAppStartParam ?? app?.initDataUnsafe?.start_param ?? null,
  };
}

export type LaunchStatus = "initializing" | "ready" | "browser" | "sdk-failed" | "data-missing";
export function launchStatus(context: LaunchContext, settled: boolean): LaunchStatus {
  if (context.initData) return "ready";
  if (!settled) return "initializing";
  if (!context.hasContext) return "browser";
  return context.sdkFailed && !context.sdkAvailable ? "sdk-failed" : "data-missing";
}
