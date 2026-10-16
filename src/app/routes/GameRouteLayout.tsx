import { Outlet, useRouterState } from "@tanstack/react-router";
import { GameShell } from "@/design-system/components/GameShell";
import { TransientFeedback } from "@/design-system/components/TransientFeedback";

export function GameRouteLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hideNavigation = pathname === "/earn/typing";
  return (
    <GameShell hideNavigation={hideNavigation}>
      <TransientFeedback />
      <Outlet />
    </GameShell>
  );
}
