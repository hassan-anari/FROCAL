import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { TelegramProvider } from "@/integrations/telegram/TelegramProvider";
import { BootstrapProvider } from "@/integrations/api/BootstrapProvider";
import { TapSessionProvider } from "@/game/base/tapV2/TapSessionProvider";
import { createAppQueryClient } from "./queryClient";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);

  useEffect(() => {
    const syncVisibility = () => {
      document.documentElement.classList.toggle("motion-page-hidden", document.hidden);
    };
    syncVisibility();
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
      <QueryClientProvider client={queryClient}>
        <TelegramProvider><BootstrapProvider><TapSessionProvider>{children}</TapSessionProvider></BootstrapProvider></TelegramProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
