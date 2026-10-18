import { useEffect, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { historyRows, loadRewardHistory } from "./rewardHistory";

/** Individual ledger queries are scoped by account and server category. */
export function useRewardHistory(category?: "network") {
  const { scope, bootstrap } = useBootstrap();
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const client = useQueryClient();
  const queryKey = category === "network" ? queryKeys.networkRewardHistory(scope) : queryKeys.rewardHistory(scope);
  const nextPageLock = useRef(false);
  const enabled = isRemoteDataSource() && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified" && Boolean(bootstrap.data);
  const history = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => loadRewardHistory(initData, pageParam, signal, category),
    initialPageParam: null as number | null,
    getNextPageParam: (page, _pages, previous) => page.next_cursor !== null && (previous === null || page.next_cursor < previous) ? page.next_cursor : undefined,
    enabled,
    staleTime: 15_000, refetchOnWindowFocus: true, retry: false,
  });
  const lastResume = useRef(-Infinity);
  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      if (document.hidden || performance.now() - lastResume.current < 1_000) return;
      lastResume.current = performance.now();
      void client.invalidateQueries({ queryKey, exact: true }, { cancelRefetch: false });
    };
    const unsubscribe = adapter.subscribe?.("activated", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { unsubscribe?.(); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); };
  }, [enabled, adapter, client, scope.session, scope.player, scope.season, scope.config, category]);
  const fetchNextPage = async () => {
    if (nextPageLock.current || !history.hasNextPage || client.isFetching({ queryKey, exact: true })) return;
    nextPageLock.current = true;
    try { return await history.fetchNextPage({ cancelRefetch: false }); }
    finally { nextPageLock.current = false; }
  };
  return { ...history, fetchNextPage, items: historyRows(history.data?.pages) };
}

export function useNetworkRewardHistory() { return useRewardHistory("network"); }
