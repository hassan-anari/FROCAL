import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { commitCanonical } from "./canonical";
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
  const query = useQuery({
    queryKey: queryKeys.profileOverview(scope),
    queryFn: async () => {
      const value = await loadProfileOverview(adapter.getInitData());
      const current = client.getQueryData<CanonicalState>(canonicalKey(scope));
      return current && current.receipt_cursor > (value.canonical?.receipt_cursor ?? -1) ? { ...value, canonical: current, progression: current.progression } : value;
    },
    enabled: isRemoteDataSource() && Boolean(adapter.getInitData()) && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.profile),
    staleTime: 30_000,
    refetchOnMount: "always",
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  useEffect(() => { if (query.data?.canonical) commitCanonical(client, scope, query.data.canonical); }, [query.data?.canonical, client, scope.session, scope.player, scope.season, scope.config]);
  return query;
}
