import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "@/app/providers/AppProviders";
import { MockProvider } from "@/app/providers/MockProvider";
import { router } from "@/app/router";
import { initMobilePerformanceMonitor } from "@/design-system/performance/mobilePerf";
import "@/design-system/styles/global.css";

// The performance monitor is dormant unless explicitly enabled from Diagnostics.
// Keep startup free of large image decode/preload work; route-level assets are
// warmed lazily by the pages that actually need them.
initMobilePerformanceMonitor();

const root = document.getElementById("root");
if (!root) throw new Error("Root element was not found");

createRoot(root).render(
  <StrictMode>
    <MockProvider>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </MockProvider>
  </StrictMode>,
);
