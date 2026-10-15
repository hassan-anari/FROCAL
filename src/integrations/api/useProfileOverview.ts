import { useQueryClient } from "@tanstack/react-query";
import { canonicalKey } from "./canonical";
import type { CanonicalState } from "./b3Contracts";
import { useQuery } from "@tanstack/react-query";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { loadProfileOverview } from "./profile";
import { queryKeys } from "./queryKeys";
export function useProfileOverview() {
  const { adapter } = useTelegram(); const { scope, bootstrap } = useBootstrap();
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.profileOverview(scope),
    queryFn: async () => {
      const value = await loadProfileOverview(adapter.getInitData());
      const current = client.getQueryData<CanonicalState>(canonicalKey(scope));
      return current && current.receipt_cursor > (value.canonical?.receipt_cursor ?? -1) ? { ...value, canonical: current, progression: current.progression } : value;
    },
    enabled: isRemoteDataSource() && Boolean(adapter.getInitData()) && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.profile),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
