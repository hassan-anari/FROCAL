import { AppLoader } from "@/design-system/components/AppLoader";
import { Button } from "@/design-system/primitives/Button";
import styles from "./ClanOverlays.module.css";

/** Reuse the approved modal copy, note and button treatments for persistent reads. */
export function ClanQueryState({ loading = false, title, description, retry, busy = false }: { loading?: boolean; title: string; description?: string; retry?: () => unknown; busy?: boolean }) {
  if (loading) return <AppLoader compact artwork="clan.hq" label={title} />;
  return <div className={styles.centerCopy} role="status" aria-live="polite">
    <strong>{title}</strong>
    {description ? <p>{description}</p> : null}
    {retry ? <Button size="sm" tone="secondary" disabled={busy} onClick={() => void retry()}>Retry</Button> : null}
  </div>;
}
