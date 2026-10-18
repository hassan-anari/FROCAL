import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { analytics } from "@/integrations/analytics/analytics";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./BootstrapProvider";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { clanApi, ClanApiError } from "./b5";
import { ApiError } from "./client";
import { selectClanApplications } from "./clanApplications";
import { clanEconomicIntent } from "./clanIntent";
import { showFeedback } from "@/design-system/components/TransientFeedback";
import type { ClanOut } from "./b6Schemas";

export function useClanRemote() {
  const { bootstrap, scope } = useBootstrap();
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const remote = isRemoteDataSource();
  const enabled = remote && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.clan);
  const api = useMemo(() => clanApi(initData), [initData]);
  const client = useQueryClient();
  const root = [...queryKeys.player(scope), "clan"];
  const read = <T,>(name: string, get: (signal: AbortSignal) => Promise<T>, available = enabled, interval = 30_000) => useQuery({ queryKey: [...root, name], queryFn: ({ signal }) => get(signal), enabled: available, retry: false, staleTime: 5_000, refetchOnWindowFocus: false, refetchInterval: available ? interval : false });
  // Fence a confirmed departed membership before any asynchronous reconciliation.
  const departedMembership = useRef<number | null>(null);
  const [leftMembership, setLeftMembership] = useState<number | null>(null);
  const state = read("state", signal => api.state(signal));
  const eligible = enabled && state.data?.enabled === true && state.data.eligible;
  const membership = read("membership", async signal => {
    try {
      const value = await api.membership(signal);
      return value?.membership_id === departedMembership.current ? null : value;
    } catch (error) {
      // Some obsolete membership reads deny access after the confirmed departure.
      // State/requests still have to refresh; a new confirmed membership keeps normal denial handling.
      if (departedMembership.current !== null && client.getQueryData([...root, "membership"]) === null
        && (error instanceof ClanApiError || error instanceof ApiError) && [401, 403].includes(error.status)) return null;
      throw error;
    }
  }, eligible && Boolean(state.data?.role), 15_000);
  // Retain confirmed content through failed background reads. Actions still fail closed.
  const membershipDenied = (membership.error instanceof ClanApiError || membership.error instanceof ApiError) && [401, 403].includes(membership.error.status);
  const member = eligible && Boolean(membership.data) && membership.data?.membership_id !== leftMembership && !membershipDenied;
  const memberKey = membership.data?.membership_id ?? "none";
  const requests = read("requests", signal => api.ownRequests(signal), eligible && state.data?.role === "SOLDIER", 15_000);
  const groups = read("groups", signal => api.eligibleGroups(signal), eligible && state.data?.role === "CAPTAIN" && membership.data === null);
  const home = read(`home:${memberKey}`, signal => api.home(signal), member);
  const roster = useInfiniteQuery({ queryKey: [...root, "roster", memberKey], queryFn: ({ pageParam, signal }) => api.roster(pageParam, signal), initialPageParam: 0, getNextPageParam: (page, _pages, offset) => page.next_offset !== null && page.next_offset > offset ? page.next_offset : undefined, enabled: member, retry: false, staleTime: 5_000, refetchOnWindowFocus: false, refetchInterval: member ? 30_000 : false });
  const treasury = read(`treasury:${memberKey}`, signal => api.treasury(signal), member);
  const activity = useInfiniteQuery({ queryKey: [...root, "activity", memberKey], queryFn: ({ pageParam, signal }) => api.activity(pageParam, signal), initialPageParam: null as string | null, getNextPageParam: page => page.next_cursor ?? undefined, enabled: member, retry: false, staleTime: 5_000, refetchOnWindowFocus: false, refetchInterval: member ? 30_000 : false });
  const equipment = read(`equipment:${memberKey}`, signal => api.equipment(signal), member);
  const missions = read(`missions:${memberKey}`, signal => api.missions(signal), member);
  const trophies = read(`trophies:${memberKey}`, signal => api.trophies(signal), member);
  const applicants = read(`applicants:${memberKey}`, signal => api.applicants(signal), member && membership.data?.role === "CAPTAIN", 15_000);
  const governance = read(`governance:${memberKey}`, signal => api.governance(signal), member);
  const recovery = read(`recovery:${memberKey}`, signal => api.recovery(signal), member);
  const identity = read(`identity:${memberKey}`, signal => api.preview(membership.data!.clan_id, signal), member);
  const [search, setSearch] = useState("");
  const discoveryEnabled = eligible && state.data?.role === "SOLDIER" && membership.data === null;
  const discovery = useInfiniteQuery({ queryKey: [...root, "discovery", search], queryFn: ({ pageParam, signal }) => api.discover(search, pageParam, signal), initialPageParam: 0, getNextPageParam: (page, _pages, offset) => page.length === 20 ? offset + page.length : undefined, enabled: discoveryEnabled, retry: false, staleTime: 5_000, refetchOnWindowFocus: false, refetchInterval: discoveryEnabled ? 30_000 : false });
  const [previewId, setPreviewId] = useState<number | null>(null);
  const preview = read(`preview:${previewId}`, signal => api.preview(previewId!, signal), eligible && previewId !== null);
  const applicationSelection = selectClanApplications(requests.data ?? []);
  const applicationProblem: "loading" | "error" | "overlap" | "operator" | null = state.isError ? "error" : !state.isSuccess ? "loading" : state.data.role !== "SOLDIER" ? null
    : requests.isError || membership.isError ? "error"
    : !requests.isSuccess || !membership.isSuccess ? "loading"
    : applicationSelection.ambiguous ? "overlap" : applicationSelection.operatorRequired ? "operator" : null;
  const activeRequest = member ? null : applicationSelection.activeRequest;
  const operatorRequest = applicationSelection.operatorRequest;
  const blockingRequests = applicationSelection.blockingRequests;
  const requestHistory = applicationSelection.history;
  const lastHistoricalRequest = requestHistory[0] ?? null; // Display only; never an action target.
  const requestDisplay = activeRequest ?? (lastHistoricalRequest?.state === "DECLINED" ? lastHistoricalRequest : null);
  const requestIdentity = read(`request-clan:${requestDisplay?.clan_id}`, signal => api.preview(requestDisplay!.clan_id, signal), eligible && applicationProblem === null && Boolean(requestDisplay));
  const applicationsBlocked = applicationProblem !== null || applicationSelection.blocksNewApplication || Boolean(member);
  const [pending, setPending] = useState<string | null>(null);
  const locks = useRef(new Set<string>());
  const refresh = useCallback(async () => {
    const results = await Promise.allSettled([
      client.invalidateQueries({ queryKey: [...queryKeys.player(scope), "clan"] }, { cancelRefetch: false, throwOnError: true }),
      client.invalidateQueries({ queryKey: queryKeys.rewardHistory(scope) }, { cancelRefetch: false, throwOnError: true }),
      client.invalidateQueries({ queryKey: queryKeys.profileOverview(scope) }, { cancelRefetch: false, throwOnError: true }),
      client.invalidateQueries({ queryKey: ["bootstrap", scope.session] }, { cancelRefetch: false, throwOnError: true }),
    ]);
    return results.every(result => result.status === "fulfilled");
  }, [client, scope.session, scope.player, scope.season, scope.config]);
  const lastResume = useRef(-Infinity);
  useEffect(() => {
    if (!enabled) return;
    const resume = () => {
      if (document.hidden || performance.now() - lastResume.current < 1_000) return;
      lastResume.current = performance.now();
      // One coalesced active-query refresh for native resume, visibility and focus.
      void client.invalidateQueries({ queryKey: [...queryKeys.player(scope), "clan"] }, { cancelRefetch: false });
    };
    const unsubscribe = adapter.subscribe?.("activated", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { unsubscribe?.(); window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); };
  }, [enabled, adapter, client, scope.session, scope.player, scope.season, scope.config]);
  const run = async <T,>(action: string, operation: () => Promise<T>): Promise<T | undefined> => {
    if (!enabled || locks.current.size) return undefined;
    locks.current.add(action); setPending(action);
    try {
      let value: T;
      try { value = await operation(); }
      catch (error) {
        showFeedback(error instanceof ClanApiError ? error.message : "Your Clan couldn't be updated. Please refresh and try again.");
        await refresh(); return undefined;
      }
      if (action === "create") analytics.featureFor(scope.player, scope.session, "clan_registration_completed");
      if (action === "join") analytics.featureFor(scope.player, scope.session, "clan_join_request_submitted");
      if (action === "create") {
        void client.resetQueries({ queryKey: [...queryKeys.player(scope), "arena", "rankings", "clans"] }).catch(() => {});
      }
      // A successful leave is final, including 204/null. Old Clan reads are obsolete.
      if (action === "leave" || (action === "dissolve" && value === null)) {
        const departed = membership.data?.membership_id ?? null;
        departedMembership.current = departed;
        setLeftMembership(departed);
        await client.cancelQueries({ queryKey: root }).catch(() => {});
        client.setQueryData([...root, "membership"], null);
        // Discard the complete stale live Clan ranking snapshot; the server owns every row/rank/count.
        void client.resetQueries({ queryKey: [...queryKeys.player(scope), "arena", "rankings", "clans"] }).catch(() => {});
        client.removeQueries({ queryKey: root, predicate: query => {
          const name = query.queryKey[root.length];
          return typeof name === "string" && !["state", "membership", "requests", "discovery", "groups"].includes(name);
        } });
        const essential = await Promise.allSettled([
          client.invalidateQueries({ queryKey: [...root, "state"], exact: true }, { throwOnError: true }),
          client.invalidateQueries({ queryKey: [...root, "membership"], exact: true }, { throwOnError: true }),
          client.invalidateQueries({ queryKey: [...root, "requests"], exact: true }, { throwOnError: true }),
        ]);
        // Nonessential account projections must not taint the committed leave outcome.
        void Promise.allSettled([
          client.invalidateQueries({ queryKey: queryKeys.profileOverview(scope) }),
          client.invalidateQueries({ queryKey: ["bootstrap", scope.session] }),
        ]);
        const recovered = essential.every(result => result.status === "fulfilled");
        const success = action === "leave" ? "You left the Clan." : "Your Clan dissolved. You cannot create another Clan during the current Season.";
        showFeedback(recovered ? success : `${success} Current status couldn't refresh. Retry from Clan status.`, recovered ? "success" : "info");
      } else if (!await refresh()) showFeedback("Clan updated. Some details couldn't refresh. Retry from Clan status.", "info");
      return value;
    }
    finally { locks.current.delete(action); setPending(null); }
  };
  const economic = async (action: "purchase" | "activate", item: string) => {
    if (!enabled || locks.current.size || !membership.data) return undefined;
    return run(`${action}:${item}`, () => clanEconomicIntent(localStorage, { player: scope.player, season: scope.season, membership: membership.data!.membership_id }, action, item, async key => {
      const result = await api[action](item, key);
      if (!result.replayed) analytics.featureFor(scope.player, scope.session, action === "purchase" ? "clan_shop_purchase_completed" : "clan_shop_activation_completed", String(result.id));
      return result;
    }));
  };
  const clock = useMemo(() => ({ at: equipment.data?.server_time ? Date.parse(equipment.data.server_time) : bootstrap.data?.serverTime ? Date.parse(bootstrap.data.serverTime) : Date.now(), tick: performance.now() }), [equipment.data, bootstrap.data?.serverTime]);
  const serverNow = () => clock.at + Math.max(0, performance.now() - clock.tick);
  const rows = <T extends { id?: number; membership_id?: number },>(pages: { items: T[] }[] | undefined) => Array.from(new Map((pages ?? []).flatMap(page => page.items).map(row => [row.membership_id ?? row.id, row])).values());
  const clans = Array.from(new Map((discovery.data?.pages.flat() ?? []).map((row: ClanOut) => [row.id, row])).values());
  return { scope, scopeKey: JSON.stringify(scope), remote, enabled, api, state, eligible, membership, membershipDenied, member, requests, activeRequest, operatorRequest, blockingRequests, requestHistory, lastHistoricalRequest, applicationProblem, applicationsBlocked, groups, home, roster, rosterRows: rows(roster.data?.pages), treasury, activity, equipment, missions, trophies, applicants, governance, recovery, identity, discovery, clans, search, setSearch, previewId, setPreviewId, preview, requestIdentity, pending, run, economic, refresh, serverNow };
}
export type ClanRemote = ReturnType<typeof useClanRemote>;
