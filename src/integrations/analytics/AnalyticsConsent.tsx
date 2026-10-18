import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { analytics, CONSENT_KEY, readConsent, type Consent, type Section } from "./analytics";
import { observeActiveTime } from "./activeTime";
import styles from "./AnalyticsConsent.module.css";

const routes: Record<string, Section | undefined> = { "/base": "base", "/clan": "clan", "/arena": "arena", "/profile": "profile", "/earn/typing": "typing" };

export function useAnalyticsPage(section: Section) {
  useEffect(() => { analytics.page(section, "/earn"); }, [section]);
}

export function AnalyticsConsent() {
  const { bootstrap } = useBootstrap();
  const { adapter, launchState } = useTelegram();
  const pathname = useRouterState({ select: state => state.location.pathname });
  const consent = useSyncExternalStore(analytics.subscribe, analytics.getConsent);
  const ready = useSyncExternalStore(analytics.subscribe, analytics.isReady);
  const [editing, setEditing] = useState(false);
  // Only a validated authenticated remote bootstrap can supply identity. Never
  // read initDataUnsafe/user, local game stores, placeholders or fixtures here.
  const verified = isRemoteDataSource() && launchState === "ready" && adapter.isTelegram
    && bootstrap.isSuccess && !bootstrap.isPlaceholderData && bootstrap.data?.remote
    ? bootstrap.data.player.id : null;
  useEffect(() => {
    // Earn owns its persisted Network/Typing subpages. No query/hash enters analytics.
    if (pathname !== "/earn") analytics.page(routes[pathname] ?? null);
  }, [pathname]);
  useEffect(() => {
    if (!ready) return;
    const active = observeActiveTime(analytics.active);
    const pageChanged = analytics.beforePageChange(active.flush);
    const activated = adapter.subscribe("activated", () => active.native(true));
    const deactivated = adapter.subscribe("deactivated", () => active.native(false));
    return () => { pageChanged(); active.stop(); activated?.(); deactivated?.(); };
  }, [ready, adapter]);
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === CONSENT_KEY || event.key === null) analytics.setConsent(readConsent(), false); };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  if (!analytics.config.enabled || !verified) return null;
  const choose = (next: Consent) => { analytics.setConsent(next); setEditing(false); };
  return <aside className={`${styles.consent} ph-no-capture`} aria-label="Demo privacy">
    {consent === "unknown" || editing ? <div className={styles.panel}>
      <strong>Help improve this demo?</strong>
      <p>With your permission, PostHog records the sections and features you use under a pseudonymous player ID. Optional replay records a masked view of your session to help us understand problems. Inputs, personal content and private images are hidden. You can withdraw anytime using Demo privacy.</p>
      <div className={styles.actions}>
        {analytics.config.replay ? <button type="button" onClick={() => choose("replay")}>Allow analytics + replay</button> : null}
        <button type="button" onClick={() => choose("analytics")}>Allow analytics only</button>
        <button type="button" onClick={() => choose("declined")}>{consent === "analytics" || consent === "replay" ? "Withdraw and stop tracking" : "No thanks"}</button>
        {editing ? <button type="button" onClick={() => setEditing(false)}>Close</button> : null}
      </div>
    </div> : <button className={styles.preference} type="button" onClick={() => setEditing(true)}>Demo privacy</button>}
  </aside>;
}
