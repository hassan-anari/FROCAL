import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState, type ReactNode } from "react";
import { TelegramProvider } from "@/integrations/telegram/TelegramProvider";
import { createAppQueryClient } from "./queryClient";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createAppQueryClient);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
      <QueryClientProvider client={queryClient}>
        <TelegramProvider>{children}</TelegramProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
