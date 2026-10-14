import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import { ApiError } from "@/integrations/api/client";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { AppLoader } from "./AppLoader";
import { AssetImage } from "./AssetImage";
import { Button } from "@/design-system/primitives/Button";
import styles from "@/pages/FoundationPage.module.css";

export function InitialApplicationState({ children }: { children: ReactNode }) {
  const { adapter, launchState, recoverLaunch } = useTelegram();
  const { bootstrap, refresh } = useBootstrap();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const remote = isRemoteDataSource();
  if (path === "/diagnostics") return children;
  if (remote && launchState === "initializing") return <AppLoader label="Initializing Telegram launch" />;
  let code: string | null = null;
  let title = "Connection interrupted";
  let message = "";
  let reopen = false;
  if (remote && launchState !== "ready") {
    code = launchState === "browser" ? "NO_TELEGRAM_CONTEXT" : launchState === "sdk-failed" ? "SDK_LOAD_FAILED" : "LAUNCH_DATA_MISSING";
    title = launchState === "browser" ? "Launch from Telegram" : "Telegram launch needs recovery";
    message = launchState === "browser"
      ? "No Telegram launch context was found. Open Dexo Land from the Telegram Mini App button."
      : launchState === "sdk-failed"
        ? "The Telegram bridge could not load and launch credentials are missing. Retry, or close and reopen the Mini App."
        : "Telegram launch credentials have not arrived. Retry, or close and reopen the Mini App.";
    reopen = true;
  } else if (bootstrap.isPending) {
    return <AppLoader label={remote ? "Authenticating with the game API" : "Entering Dexo Land"} />;
  } else if (bootstrap.isError) {
    code = bootstrap.error instanceof ApiError ? bootstrap.error.code : "BOOTSTRAP_FAILED";
    message = bootstrap.error instanceof ApiError ? bootstrap.error.message : "The initial game data could not load. Please retry.";
    reopen = ["AUTH_MISSING", "AUTH_INVALID", "AUTH_EXPIRED", "AUTH_REJECTED"].includes(code);
    if (reopen) title = "Telegram authorization needs renewal";
  } else if (remote && bootstrap.data && path !== "/" && path !== "/onboarding" && path !== "/profile"
    && (!bootstrap.data.featureFlags.season || bootstrap.data.season.id === "no-active-season" || bootstrap.data.season.status !== "live")) {
    code = "SEASON_UNAVAILABLE";
    title = bootstrap.data.season.id === "no-active-season" ? "Season unavailable" : bootstrap.data.season.name;
    message = "This Season is not available for play. Your player profile and Lifetime XP are preserved. Retry for the latest Season state.";
  }
  if (!code && remote && bootstrap.data) {
    const feature = path === "/arena" ? "arena" : path === "/profile" ? "profile" : path === "/clan" ? "clan" : null;
    const clanMinLevel = bootstrap.data.remote?.config.progression?.clan_min_level;
    // Retain the approved below-threshold Clan screen; a disabled policy at/above
    // its gate must not expose role selection or pretend the player needs Level 5.
    const clanLevelLocked = feature === "clan" && clanMinLevel !== null
      && bootstrap.data.player.level < (clanMinLevel ?? 5);
    if (feature && !bootstrap.data.featureFlags[feature] && !clanLevelLocked) {
      code = "FEATURE_UNAVAILABLE";
      title = `${feature === "clan" ? "Clan" : feature === "arena" ? "Arena" : "Profile"} is unavailable`;
      message = "This feature is not available in the current game configuration. Retry for the latest availability.";
    }
  }
  if (!code) return children;
  return <main className={styles.errorState} role="alert" data-initial-state={code}>
    <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
    <div className={styles.scrim} aria-hidden="true" />
    <section>
      <span>{code.replaceAll("_", " ")}</span><h1>{title}</h1><p>{message}</p>
      <Button onClick={() => { recoverLaunch(); if (launchState === "ready" || !remote) refresh(); }}>Retry</Button>
      {reopen ? <Button tone="secondary" onClick={() => adapter.openTelegramLink(import.meta.env.VITE_TELEGRAM_BOT_URL ?? "https://t.me/DalexioBot?start=dexoairdrop")}>Open Telegram</Button> : null}
      <details><summary>Launch diagnostics</summary>
        <p>Bridge: {document.documentElement.dataset.telegramSdk ?? "unknown"} · Context: {adapter.isTelegram ? "present" : "absent"} · Credentials: {adapter.getInitData() ? "present" : "missing"} · Client: {adapter.getClientPlatform()}</p>
        <p>Recovery code: {code}{bootstrap.error instanceof ApiError && bootstrap.error.requestId ? ` · Request: ${bootstrap.error.requestId}` : ""}</p>
      </details>
    </section>
  </main>;
}
