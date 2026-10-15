import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import { ApiError } from "@/integrations/api/client";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { AppLoader } from "./AppLoader";
import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";
import { AssetImage } from "./AssetImage";
import { Button } from "@/design-system/primitives/Button";
import styles from "@/pages/FoundationPage.module.css";
import { sessionRecovery } from "@/game/base/tapV2/recovery";
import { OverlayFrame } from "@/features/profile/ProfileOverlays";

export function InitialApplicationState({ children }: { children: ReactNode }) {
  const { adapter, launchState, recoverLaunch } = useTelegram();
  const { bootstrap, refresh } = useBootstrap();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const remote = isRemoteDataSource();
  const tap = useTapSession();
  const submitting = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  if (import.meta.env.DEV && path === "/diagnostics") return children;
  if (remote && launchState === "initializing") return <AppLoader label="Initializing Telegram launch" />;
  let code: string | null = null;
  let label = "CONNECTION ISSUE";
  let title = "Having trouble connecting";
  let message = "";
  let reopen = false;
  let tapRecovery = false;
  if (remote && launchState !== "ready") {
    code = launchState === "browser" ? "NO_TELEGRAM_CONTEXT" : launchState === "sdk-failed" ? "SDK_LOAD_FAILED" : "LAUNCH_DATA_MISSING";
    title = launchState === "browser" ? "Launch from Telegram" : "Telegram launch needs recovery";
    label = "OPEN TELEGRAM";
    message = launchState === "browser"
      ? "No Telegram launch context was found. Open Dexo Land from the Telegram Mini App button."
      : "Please close the Mini App and open it again from Telegram, or try again.";
    reopen = true;
  } else if (bootstrap.isPending) {
    return <AppLoader label={remote ? "Authenticating with the game API" : "Entering Dexo Land"} />;
  } else if (bootstrap.isError) {
    code = bootstrap.error instanceof ApiError ? bootstrap.error.code : "BOOTSTRAP_FAILED";
    ({ label, title, message, reopen } = sessionRecovery(code));
  } else if (remote && bootstrap.data && path !== "/" && path !== "/onboarding" && path !== "/profile"
    && (!bootstrap.data.featureFlags.season || bootstrap.data.season.id === "no-active-season" || bootstrap.data.season.status !== "live")) {
    code = "SEASON_UNAVAILABLE";
    label = "SEASON UNAVAILABLE";
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
      label = "UNAVAILABLE";
      title = `${feature === "clan" ? "Clan" : feature === "arena" ? "Arena" : "Profile"} is unavailable`;
      message = "This feature is not available in the current game configuration. Retry for the latest availability.";
    }
  }
  if (!code && remote && path === "/base" && tap && (
    ["storage-blocked", "session-busy", "terminal"].includes(tap.view.status)
    || (tap.view.status === "paused" && tap.view.error
      && (!["COOLDOWN", "RATE_LIMITED"].includes(tap.view.error) || tap.view.canSwitchDevice))
  )) {
    code = tap.view.error ?? (tap.view.status === "storage-blocked" ? "STORAGE_UNAVAILABLE" : "SESSION_UNAVAILABLE");
    const recoveryCode = code === "COOLDOWN" && tap.view.canSwitchDevice
      ? tap.view.committed?.ownership?.status === "SESSION_MOVED" ? "LEASE_REVOKED" : "ACTIVE_SESSION"
      : code;
    ({ label, title, message, reopen } = sessionRecovery(recoveryCode, tap.view.status));
    tapRecovery = true;
  }
  if (!code) return children;
  return <main className={styles.errorState} role="alert" data-initial-state={code}>
    <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
    <div className={styles.scrim} aria-hidden="true" />
    <section>
      <span>{label}</span><h1>{title}</h1><p>{message}</p>
      <Button disabled={retrying || Boolean(tapRecovery && (tap?.view.recovering || tap?.view.error === "COOLDOWN"))} onClick={async () => {
        if (submitting.current) return;
        submitting.current = true;
        setRetrying(true);
        try {
          if (tapRecovery) await tap?.retry();
          else if (launchState === "ready" || !remote) await refresh();
          else recoverLaunch();
        } finally { submitting.current = false; setRetrying(false); }
      }}>Try Again</Button>
      {tapRecovery && tap?.view.canSwitchDevice ? <Button tone="secondary" disabled={retrying || tap.view.recovering || tap.view.error === "COOLDOWN"}
        onClick={() => setConfirmSwitch(true)}>Switch to This Device</Button> : null}
      {retrying || (tapRecovery && tap?.view.recovering) ? <p role="status" aria-live="polite">Trying to reconnect…</p> : null}
      {tapRecovery && tap?.view.error === "COOLDOWN" ? <p role="status">Please wait a moment before trying again.</p> : null}
      {reopen ? <Button tone="secondary" onClick={() => adapter.openTelegramLink(import.meta.env.VITE_TELEGRAM_BOT_URL ?? "https://t.me/DalexioBot?start=dexoairdrop")}>Open Telegram</Button> : null}
    </section>
    {confirmSwitch ? <OverlayFrame eyebrow="SWITCH DEVICE" title="Continue on this device?" onClose={() => setConfirmSwitch(false)} footer={
      <Button disabled={retrying} onClick={async () => {
        if (submitting.current) return;
        submitting.current = true; setRetrying(true); setConfirmSwitch(false);
        try { await tap?.switchDevice(); }
        finally { submitting.current = false; setRetrying(false); }
      }}>Switch to This Device</Button>
    }><p>Your game will pause on your other device so you can continue here.</p></OverlayFrame> : null}
  </main>;
}
