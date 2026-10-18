import { useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./BootstrapProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { historyRows, loadRewardHistory } from "./rewardHistory";

/** Base Recent Rewards and the approved Earn sheet observe the same authenticated cache. */
export function useRewardHistory() {
  const { scope, bootstrap } = useBootstrap();
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const client = useQueryClient();
  const nextPageLock = useRef(false);
  const history = useInfiniteQuery({
    queryKey: queryKeys.rewardHistory(scope),
    queryFn: ({ pageParam, signal }) => loadRewardHistory(initData, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (page, _pages, previous) => page.next_cursor !== null && (previous === null || page.next_cursor < previous) ? page.next_cursor : undefined,
    enabled: isRemoteDataSource() && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified" && Boolean(bootstrap.data),
    staleTime: 15_000, refetchOnWindowFocus: true, retry: false,
  });
  const fetchNextPage = async () => {
    if (nextPageLock.current || !history.hasNextPage || client.isFetching({ queryKey: queryKeys.rewardHistory(scope), exact: true })) return;
    nextPageLock.current = true;
    try { return await history.fetchNextPage({ cancelRefetch: false }); }
    finally { nextPageLock.current = false; }
  };
  return { ...history, fetchNextPage, items: historyRows(history.data?.pages) };
}
