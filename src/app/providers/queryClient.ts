import { shouldRetry } from "@/integrations/api/client";
import { QueryClient } from "@tanstack/react-query";

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2_000),
        refetchOnWindowFocus: false,
      },
    },
  });
}
