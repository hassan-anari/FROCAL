import { useQuery } from "@tanstack/react-query";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { loadProfileOverview } from "./profile";
import { queryKeys } from "./queryKeys";
export function useProfileOverview() {
  const { adapter } = useTelegram(); const { scope } = useBootstrap();
  return useQuery({
    queryKey: queryKeys.profileOverview(scope),
    queryFn: () => loadProfileOverview(adapter.getInitData()),
    enabled: isRemoteDataSource() && Boolean(adapter.getInitData()) && scope.player !== "unverified",
    staleTime: 30_000,
  });
}
