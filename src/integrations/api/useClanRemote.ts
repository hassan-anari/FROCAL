import { useCallback, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "./BootstrapProvider";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { isRemoteDataSource } from "./bootstrap";
import { queryKeys } from "./queryKeys";
import { clanApi, ClanApiError } from "./b5";
import { selectClanApplications } from "./clanApplications";
import { clanEconomicIntent } from "./clanIntent";
import { showFeedback } from "@/design-system/components/TransientFeedback";
import type { ClanOut } from "./b5Schemas";

export function useClanRemote() {
  const { bootstrap, scope } = useBootstrap();
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const remote = isRemoteDataSource();
  const enabled = remote && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified" && Boolean(bootstrap.data?.featureFlags.clan);
  const api = useMemo(() => clanApi(initData), [initData]);
  const client = useQueryClient();
  const root = [...queryKeys.player(scope), "clan"];
  const read = <T,>(name: string, get: (signal: AbortSignal) => Promise<T>, available = enabled) => useQuery({ queryKey: [...root, name], queryFn: ({ signal }) => get(signal), enabled: available, retry: false, staleTime: 5_000, refetchOnWindowFocus: true, refetchInterval: available ? 15_000 : false });
  const state = read("state", signal => api.state(signal));
  const eligible = enabled && state.data?.enabled === true && state.data.eligible;
  const membership = read("membership", signal => api.membership(signal), eligible && Boolean(state.data?.role));
  const member = eligible && Boolean(membership.data) && !membership.isError;
  const memberKey = membership.data?.membership_id ?? "none";
  const requests = read("requests", signal => api.ownRequests(signal), eligible && state.data?.role === "SOLDIER");
  const groups = read("groups", signal => api.eligibleGroups(signal), eligible && state.data?.role === "CAPTAIN" && membership.data === null);
  const home = read(`home:${memberKey}`, signal => api.home(signal), member);
  const roster = useInfiniteQuery({ queryKey: [...root, "roster", memberKey], queryFn: ({ pageParam, signal }) => api.roster(pageParam, signal), initialPageParam: 0, getNextPageParam: (page, _pages, offset) => page.next_offset !== null && page.next_offset > offset ? page.next_offset : undefined, enabled: member, retry: false, staleTime: 5_000, refetchOnWindowFocus: true });
  const treasury = read(`treasury:${memberKey}`, signal => api.treasury(signal), member);
  const equipment = read(`equipment:${memberKey}`, signal => api.equipment(signal), member);
  const missions = read(`missions:${memberKey}`, signal => api.missions(signal), member);
  const trophies = read(`trophies:${memberKey}`, signal => api.trophies(signal), member);
  const applicants = read(`applicants:${memberKey}`, signal => api.applicants(signal), member && membership.data?.role === "CAPTAIN");
  const governance = read(`governance:${memberKey}`, signal => api.governance(signal), member);
  const recovery = read(`recovery:${memberKey}`, signal => api.recovery(signal), member);
  const identity = read(`identity:${memberKey}`, signal => api.preview(membership.data!.clan_id, signal), member);
  const [search, setSearch] = useState("");
  const discovery = useInfiniteQuery({ queryKey: [...root, "discovery", search], queryFn: ({ pageParam, signal }) => api.discover(search, pageParam, signal), initialPageParam: 0, getNextPageParam: (page, _pages, offset) => page.length === 20 ? offset + page.length : undefined, enabled: eligible && state.data?.role === "SOLDIER" && membership.data === null, retry: false, staleTime: 5_000 });
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
    await client.invalidateQueries({ queryKey: [...queryKeys.player(scope), "clan"] });
    await Promise.all([client.invalidateQueries({ queryKey: queryKeys.rewardHistory(scope) }), client.invalidateQueries({ queryKey: queryKeys.profileOverview(scope) }), client.invalidateQueries({ queryKey: ["bootstrap", scope.session] })]);
  }, [client, scope.session, scope.player, scope.season, scope.config]);
  const run = async <T,>(action: string, operation: () => Promise<T>): Promise<T | undefined> => {
    if (!enabled || locks.current.size) return undefined;
    locks.current.add(action); setPending(action);
    try { const value = await operation(); await refresh(); return value; }
    catch (error) { showFeedback(error instanceof ClanApiError ? error.message : "Your Clan couldn't be updated. Please refresh and try again."); await refresh(); return undefined; }
    finally { locks.current.delete(action); setPending(null); }
  };
  const economic = async (action: "purchase" | "activate", item: string) => {
    if (!enabled || locks.current.size || !membership.data) return undefined;
    return run(`${action}:${item}`, () => clanEconomicIntent(localStorage, { player: scope.player, season: scope.season, membership: membership.data!.membership_id }, action, item, key => api[action](item, key)));
  };
  const clock = useMemo(() => ({ at: equipment.data?.server_time ? Date.parse(equipment.data.server_time) : bootstrap.data?.serverTime ? Date.parse(bootstrap.data.serverTime) : Date.now(), tick: performance.now() }), [equipment.data, bootstrap.data?.serverTime]);
  const serverNow = () => clock.at + Math.max(0, performance.now() - clock.tick);
  const rows = <T extends { id?: number; membership_id?: number },>(pages: { items: T[] }[] | undefined) => Array.from(new Map((pages ?? []).flatMap(page => page.items).map(row => [row.membership_id ?? row.id, row])).values());
  const clans = Array.from(new Map((discovery.data?.pages.flat() ?? []).map((row: ClanOut) => [row.id, row])).values());
  return { scope, scopeKey: JSON.stringify(scope), remote, enabled, api, state, eligible, membership, member, requests, activeRequest, operatorRequest, blockingRequests, requestHistory, lastHistoricalRequest, applicationProblem, applicationsBlocked, groups, home, roster, rosterRows: rows(roster.data?.pages), treasury, equipment, missions, trophies, applicants, governance, recovery, identity, discovery, clans, search, setSearch, previewId, setPreviewId, preview, requestIdentity, pending, run, economic, refresh, serverNow };
}
export type ClanRemote = ReturnType<typeof useClanRemote>;
