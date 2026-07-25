import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./DiagnosticsButton.module.css";

export function DiagnosticsButton() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();
  const isDiagnostics = pathname === "/diagnostics";

  const handleClick = () => {
    adapter.hapticImpact("light");
    void navigate({ to: isDiagnostics ? "/" : "/diagnostics" });
  };

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleClick}
      aria-label={isDiagnostics ? "Back to Dexo Land" : "Open diagnostics"}
      title={isDiagnostics ? "Back to Dexo Land" : "Diagnostics"}
    >
      {isDiagnostics ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 5 7.5 12l7 7" />
          <path d="M8 12h9" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 8v4l2.5 2" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
      )}
    </button>
  );
}
