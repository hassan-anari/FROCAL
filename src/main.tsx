import "@fontsource-variable/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { AppProviders } from "@/app/providers/AppProviders";
import { MockProvider } from "@/app/providers/MockProvider";
import { router } from "@/app/router";
import { preloadAssets } from "@/assets/preload";
import { clanPreloadAssets } from "@/game/clan/clanVisuals";
import "@/design-system/styles/global.css";

// Start warming the Clan art cache as soon as the application bundle executes.
// Rendering is not blocked; the browser fetches and decodes these assets in parallel.
void preloadAssets(clanPreloadAssets);

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
