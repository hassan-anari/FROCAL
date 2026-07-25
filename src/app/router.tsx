import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { RootLayout } from "./routes/RootLayout";
import { FoundationPage } from "@/pages/FoundationPage";
import { DiagnosticsPage } from "@/pages/DiagnosticsPage";

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: FoundationPage,
});

const diagnosticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/diagnostics",
  component: DiagnosticsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, diagnosticsRoute]);

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
