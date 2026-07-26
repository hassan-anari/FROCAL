import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "./routes/RootLayout";
import { FoundationPage } from "@/pages/FoundationPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { BasePage } from "@/pages/BasePage";
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

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diagnostics",
  component: DiagnosticsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, onboardingRoute, baseRoute, diagnosticsRoute]);

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
