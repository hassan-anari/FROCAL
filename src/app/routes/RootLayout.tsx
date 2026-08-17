import { Outlet, useRouterState } from "@tanstack/react-router";
import { AppErrorBoundary } from "@/design-system/components/AppErrorBoundary";
import { DevScenarioPanel } from "@/design-system/components/DevScenarioPanel";
import { GameShell } from "@/design-system/components/GameShell";
import styles from "./RootLayout.module.css";

const gamePaths = new Set(["/base", "/earn", "/earn/typing", "/clan", "/arena", "/profile"]);

export function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isGameRoute = gamePaths.has(pathname);

  return (
    <AppErrorBoundary>
      <div className={`dalexio-app-host ${styles.host}`}>
        <div className={`dalexio-app-viewport ${styles.viewport}`}>
          {isGameRoute ? (
            <GameShell hideNavigation={pathname === "/earn/typing"}>
              <Outlet />
            </GameShell>
          ) : (
            <Outlet />
          )}
          <DevScenarioPanel />
        </div>
      </div>
    </AppErrorBoundary>
  );
}
