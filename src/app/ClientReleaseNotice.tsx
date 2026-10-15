import { useEffect, useState } from "react";
import { CLIENT_STORAGE_RELEASE, hasPendingTapEvidence } from "./storageRelease";
import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";
import { OverlayFrame } from "@/features/profile/ProfileOverlays";
import { Button } from "@/design-system/primitives/Button";

/** Deliberate compatibility changes only. Build/asset hashes never clear storage. */
export function ClientReleaseNotice() {
  const tap = useTapSession();
  const [release, setRelease] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const abort = new AbortController();
    let reading = false;
    const check = async () => {
      if (document.hidden || reading) return;
      reading = true;
      try {
        const response = await fetch("/client-release.json", { cache: "no-store", signal: abort.signal });
        if (!response.ok) return;
        const value: unknown = await response.json();
        const compatibility = value && typeof value === "object" && "storage_compatibility" in value ? value.storage_compatibility : null;
        if (typeof compatibility === "string" && /^[a-z0-9-]{1,40}$/.test(compatibility)) {
          setRelease(compatibility === CLIENT_STORAGE_RELEASE ? null : compatibility);
        }
      } catch { /* Offline/version lookup failures never interrupt gameplay. */ }
      finally { reading = false; }
    };
    void check();
    const interval = window.setInterval(() => void check(), 60_000);
    document.addEventListener("visibilitychange", check);
    return () => { abort.abort(); clearInterval(interval); document.removeEventListener("visibilitychange", check); };
  }, []);
  if (!release || release === dismissed) return null;
  return <OverlayFrame eyebrow="GAME UPDATE" title="An update is ready" onClose={() => setDismissed(release)} footer={
    <Button onClick={() => {
      try {
        if (hasPendingTapEvidence(localStorage) || (tap && !tap.prepareReload())) { setWaiting(true); return; }
      } catch { setWaiting(true); return; }
      window.location.reload();
    }}>Refresh Game</Button>
  }>
    <p>{waiting ? "Your game is still saving. Please try again shortly, or continue playing." : "Refresh Dexo Land when you're ready to continue with the latest update."}</p>
  </OverlayFrame>;
}
