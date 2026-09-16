/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV?: string;
  readonly VITE_DATA_SOURCE?: "local" | "msw" | "remote";
  readonly VITE_API_BASE_PATH?: string;
  readonly VITE_ENABLE_DEV_PANEL?: string;
  readonly VITE_TELEGRAM_BOT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
