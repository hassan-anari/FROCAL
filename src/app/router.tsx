import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "./routes/RootLayout";
import { FoundationPage } from "@/pages/FoundationPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { BasePage } from "@/pages/BasePage";
import { EarnPage } from "@/pages/EarnPage";
import { TypingChallengePage } from "@/pages/TypingChallengePage";
import { ClanPage } from "@/pages/ClanPage";
import { ArenaPage } from "@/pages/ArenaPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { DiagnosticsPage } from "@/pages/DiagnosticsPage";

const rootRoute = createRootRoute({ component: RootLayout });

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
  getParentRoute: () => rootRoute,
  path: "/base",
  component: BasePage,
});

const earnRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/earn",
  component: EarnPage,
});

const typingChallengeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/earn/typing",
  component: TypingChallengePage,
});

const clanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clan",
  component: ClanPage,
});

const arenaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/arena",
  component: ArenaPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diagnostics",
  component: DiagnosticsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  onboardingRoute,
  baseRoute,
  earnRoute,
  typingChallengeRoute,
  clanRoute,
  arenaRoute,
  profileRoute,
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
