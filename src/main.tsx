import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "@/app/providers/AppProviders";
import { MockProvider } from "@/app/providers/MockProvider";
import { router } from "@/app/router";
import { preloadAssetsIdle } from "@/assets/preload";
import { clanPreloadAssets } from "@/game/clan/clanVisuals";
import "@/design-system/styles/global.css";

// Keep heavy Clan art away from the interaction-critical startup window.
// Assets are decoded in tiny idle batches so Telegram mobile can preserve its
// frame budget for navigation and overlay motion.
preloadAssetsIdle(clanPreloadAssets, { delay: 1_400, batchSize: 1, timeout: 2_800 });

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
