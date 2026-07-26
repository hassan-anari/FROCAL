import { ArrowLeft01Icon, DashboardSpeed01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./DiagnosticsButton.module.css";

const returnPathKey = "dalexio-diagnostics-return-path";

export function DiagnosticsButton() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();
  const isDiagnostics = pathname === "/diagnostics";

  const handleClick = () => {
    adapter.hapticImpact("light");
    if (isDiagnostics) {
      const returnPath = sessionStorage.getItem(returnPathKey) ?? "/";
      void navigate({ to: returnPath as "/" | "/onboarding" | "/base" | "/earn" | "/clan" | "/arena" | "/profile" });
      return;
    }
    sessionStorage.setItem(returnPathKey, pathname);
    void navigate({ to: "/diagnostics" });
  };

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleClick}
      aria-label={isDiagnostics ? "Back to previous screen" : "Open diagnostics"}
      title={isDiagnostics ? "Back" : "Diagnostics"}
    >
      <HugeiconsIcon
        icon={isDiagnostics ? ArrowLeft01Icon : DashboardSpeed01Icon}
        size={17}
        strokeWidth={1.8}
      />
    </button>
  );
}
