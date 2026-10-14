import { Outlet } from "@tanstack/react-router";
import { InitialApplicationState } from "@/design-system/components/InitialApplicationState";
import { AppErrorBoundary } from "@/design-system/components/AppErrorBoundary";
import { DevScenarioPanel } from "@/design-system/components/DevScenarioPanel";
import styles from "./RootLayout.module.css";

export function RootLayout() {
  return (
    <AppErrorBoundary>
      <div className={`dalexio-app-host ${styles.host}`}>
        <div className={`dalexio-app-viewport ${styles.viewport}`}>
          <InitialApplicationState><Outlet /></InitialApplicationState>
          <DevScenarioPanel />
        </div>
      </div>
    </AppErrorBoundary>
  );
}
