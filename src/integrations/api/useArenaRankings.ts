import { useEffect, useRef } from "react";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { showFeedback } from "@/design-system/components/TransientFeedback";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { loadArenaState, loadRankings } from "./arena";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
export function useArenaRankings(mode: "players" | "clans") {
  const { scope, bootstrap } = useBootstrap();
  const { adapter } = useTelegram();
  const lastResume = useRef(-Infinity);
  const readable = isRemoteDataSource() && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.arena);
  const currentSeason = bootstrap.data?.remote?.season;
  const archive = useQuery({
    queryKey: [...queryKeys.player(scope), "arena", "archive-state"],
    queryFn: ({ signal }) => loadArenaState(signal),
    enabled: readable && !currentSeason, retry: false, staleTime: 30_000,
  });
  // The backend orders this read-only list. Never synthesize a Season or timing.
  const season = currentSeason ?? archive.data?.seasons.find(s => ["CLOSED", "ARCHIVED"].includes(s.status));
  const enabled = readable && Boolean(season);
  const query = useInfiniteQuery({
    queryKey: [...queryKeys.player(scope), "arena", "rankings", mode, season?.code ?? "unavailable"],
    queryFn: ({ pageParam, signal }) => loadRankings(mode, pageParam, signal, season?.code),
    initialPageParam: 0,
    getNextPageParam: page => page.next_offset === undefined ? page.items.length === page.limit ? page.offset + page.limit : undefined : page.next_offset ?? undefined,
    enabled,
    staleTime: 10_000, refetchOnMount: "always", refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.hidden || performance.now() - lastResume.current < 1000) return;
      lastResume.current = performance.now();
      void query.refetch({ cancelRefetch: false });
    };
    const unsubscribe = adapter.subscribe?.("activated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { unsubscribe?.(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [enabled, query.refetch, adapter]);
  useEffect(() => { if (query.error || archive.error) showFeedback("Rankings couldn't load. Please try again."); }, [query.error, archive.error]);
  return { ...query, season };
}
