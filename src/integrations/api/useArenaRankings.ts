import { useEffect } from "react";
import { showFeedback } from "@/design-system/components/TransientFeedback";
import { useInfiniteQuery } from "@tanstack/react-query";
import { loadRankings } from "./arena";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
export function useArenaRankings(mode: "players" | "clans") {
  const { scope, bootstrap } = useBootstrap();
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.player(scope), "arena", "rankings", mode],
    queryFn: ({ pageParam, signal }) => loadRankings(mode, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: page => page.items.length === page.limit ? page.offset + page.limit : undefined,
    enabled: isRemoteDataSource() && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.arena),
    staleTime: 10_000, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  useEffect(() => { if (query.error) showFeedback("Rankings couldn't load. Please try again."); }, [query.error]);
  return query;
}
