import { Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { InitialApplicationState } from "@/design-system/components/InitialApplicationState";
import { AppErrorBoundary } from "@/design-system/components/AppErrorBoundary";
import styles from "./RootLayout.module.css";
import { ClientReleaseNotice } from "../ClientReleaseNotice";

const DevScenarioPanel = import.meta.env.DEV
  ? lazy(() => import("@/design-system/components/DevScenarioPanel").then((module) => ({ default: module.DevScenarioPanel })))
  : null;

export function RootLayout() {
  return (
    <AppErrorBoundary>
      <div className={`dalexio-app-host ${styles.host}`}>
        <div className={`dalexio-app-viewport ${styles.viewport}`}>
          <InitialApplicationState><Outlet /></InitialApplicationState>
          <ClientReleaseNotice />
          {DevScenarioPanel ? <Suspense fallback={null}><DevScenarioPanel /></Suspense> : null}
        </div>
      </div>
    </AppErrorBoundary>
  );
}
