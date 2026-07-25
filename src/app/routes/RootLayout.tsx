import { Outlet } from "@tanstack/react-router";
import { AppErrorBoundary } from "@/design-system/components/AppErrorBoundary";
import { DevScenarioPanel } from "@/design-system/components/DevScenarioPanel";
import styles from "./RootLayout.module.css";

export function RootLayout() {
  return (
    <AppErrorBoundary>
      <div className={styles.host}>
        <div className={styles.viewport}>
          <Outlet />
          <DevScenarioPanel />
        </div>
      </div>
    </AppErrorBoundary>
  );
}
