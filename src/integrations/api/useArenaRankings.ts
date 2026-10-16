import { useEffect } from "react";
import { showFeedback } from "@/design-system/components/TransientFeedback";
import { useInfiniteQuery } from "@tanstack/react-query";
import { loadRankings } from "./arena";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
export function useArenaRankings(mode: "players" | "clans") {
  const { scope, bootstrap } = useBootstrap();
  const enabled = isRemoteDataSource() && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.arena && bootstrap.data.season);
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.player(scope), "arena", "rankings", mode],
    queryFn: ({ pageParam, signal }) => loadRankings(mode, pageParam, signal, scope.season),
    initialPageParam: 0,
    getNextPageParam: page => page.next_offset === undefined ? page.items.length === page.limit ? page.offset + page.limit : undefined : page.next_offset ?? undefined,
    enabled,
    staleTime: 10_000, refetchOnMount: "always", refetchOnWindowFocus: true,
  });
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    const refresh = () => {
      if (document.hidden || Date.now() - last < 1000) return;
      last = Date.now();
      void query.refetch();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [enabled, query.refetch]);
  useEffect(() => { if (query.error) showFeedback("Rankings couldn't load. Please try again."); }, [query.error]);
  return query;
}
