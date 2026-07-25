import { Outlet } from "@tanstack/react-router";
import { AppErrorBoundary } from "@/design-system/components/AppErrorBoundary";
import { DevScenarioPanel } from "@/design-system/components/DevScenarioPanel";

export function RootLayout() {
  return (
    <AppErrorBoundary>
      <Outlet />
      <DevScenarioPanel />
    </AppErrorBoundary>
  );
}
