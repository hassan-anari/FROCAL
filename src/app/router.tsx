import { createRootRoute, createRoute, createRouter, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { RootLayout } from "./routes/RootLayout";
import { GameRouteLayout } from "./routes/GameRouteLayout";
import { FoundationPage } from "@/pages/FoundationPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { BasePage } from "@/pages/BasePage";
import { EarnPage } from "@/pages/EarnPage";
import { TypingChallengePage } from "@/pages/TypingChallengePage";
import { ClanPage } from "@/pages/ClanPage";
import { ArenaPage } from "@/pages/ArenaPage";
import { ProfilePage } from "@/pages/ProfilePage";

const DiagnosticsPage = import.meta.env.DEV
  ? lazy(() => import("@/pages/DiagnosticsPage").then((module) => ({ default: module.DiagnosticsPage })))
  : null;

const rootRoute = createRootRoute({ component: RootLayout });

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_game",
  component: GameRouteLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FoundationPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const baseRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: "base",
  component: BasePage,
});

const earnRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: "earn",
  component: EarnPage,
});

const typingChallengeRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: "earn/typing",
  component: TypingChallengePage,
});

const clanRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: "clan",
  component: ClanPage,
});

const arenaRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: "arena",
  component: ArenaPage,
});

const profileRoute = createRoute({
  getParentRoute: () => gameRoute,
  path: "profile",
  component: ProfilePage,
});

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diagnostics",
  beforeLoad: ({ location }) => {
    if (!import.meta.env.DEV) throw redirect({ to: "/", hash: location.hash, replace: true });
  },
  component: () => DiagnosticsPage ? <Suspense fallback={null}><DiagnosticsPage /></Suspense> : null,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  gameRoute.addChildren([baseRoute, earnRoute, typingChallengeRoute, clanRoute, arenaRoute, profileRoute]),
  diagnosticsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 20_000,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
