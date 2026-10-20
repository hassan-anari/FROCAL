import { readPlayerOnboarding } from "@/app/storageRelease";
import { analytics } from "@/integrations/analytics/analytics";
import { canonicalKey } from "./canonical";
import type { CanonicalState } from "./b3Contracts";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { BootstrapPayload } from "@/game/domain/schemas";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { dataSource, loadBootstrap } from "./bootstrap";
import { configCacheScope, type BootstrapProgressionPolicy } from "./bootstrapContract";
import { queryKeys, type PlayerScope } from "./queryKeys";

interface BootstrapContextValue {
  bootstrap: UseQueryResult<BootstrapPayload, Error>;
  scope: PlayerScope;
  refresh: () => Promise<unknown>;
  progressionPolicy: BootstrapProgressionPolicy | null;
  authorityReady: boolean;
  denyEarning: () => void;
}
const Context = createContext<BootstrapContextValue | null>(null);

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const { adapter, launchState } = useTelegram();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const source = dataSource();
  const initData = adapter.getInitData();
  // Opaque memory-only session generation: raw credentials never enter query keys,
  // diagnostics or application persistence. A different credential gets fresh caches.
  const sessionRef = useRef({ credential: initData, id: 1 });
  if (sessionRef.current.credential !== initData) {
    sessionRef.current = { credential: initData, id: sessionRef.current.id + 1 };
  }
  const session = sessionRef.current.id;
  const client = useQueryClient();
  const [authorityReady, setAuthorityReady] = useState(true);
  const authorityGeneration = useRef(0);
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(session, source, scenario, adapter.platform),
    queryFn: async ({ signal }) => {
      const value = await loadBootstrap(scenario, adapter.platform, initData, signal);
      const previous = client.getQueryData<BootstrapPayload>(queryKeys.bootstrap(session, source, scenario, adapter.platform));
      if (previous?.remote && value.remote && Date.parse(value.serverTime) < Date.parse(previous.serverTime)) return previous;
      const current = value.remote ? client.getQueryData<CanonicalState>(canonicalKey({ session, player: value.player.id, season: value.season.id, config: configCacheScope(value.remote.config) })) : undefined;
      if (!current || !value.remote || current.receipt_cursor <= (value.remote.canonical?.receipt_cursor ?? -1)) return value;
      const p = current.progression;
      return { ...value, player: { ...value.player, lifetimeXp: p.lifetime_points, seasonScore: current.season_points, level: p.level, xp: p.points_into_level, xpToNextLevel: p.next_threshold === null ? Math.max(1,p.points_into_level) : p.next_threshold - p.current_threshold }, dexo: { ...value.dexo, level: p.level, stage: p.dexo_stage }, remote: { ...value.remote, canonical: current, progression: p, season: value.remote.season ? { ...value.remote.season, season_points: current.season_points } : null } };
    },
    enabled: source !== "remote" || launchState === "ready",
    refetchOnWindowFocus: source === "remote",
    refetchInterval: source === "remote" ? 60_000 : false,
  });
  const revalidateAuthority = useCallback(() => {
    const generation = ++authorityGeneration.current;
    setAuthorityReady(false);
    if (document.hidden) return;
    void client.cancelQueries({ queryKey: queryKeys.bootstrap(session, source, scenario, adapter.platform), exact: true })
      .then(() => bootstrap.refetch()).then(result => {
        if (generation === authorityGeneration.current) setAuthorityReady(!result.isError);
      });
  }, [client, session, source, scenario, adapter.platform, bootstrap.refetch]);
  useEffect(() => {
    if (source !== "remote") return;
    document.addEventListener("visibilitychange", revalidateAuthority);
    window.addEventListener("focus", revalidateAuthority);
    return () => {
      authorityGeneration.current++;
      document.removeEventListener("visibilitychange", revalidateAuthority);
      window.removeEventListener("focus", revalidateAuthority);
    };
  }, [source, revalidateAuthority]);
  const scope: PlayerScope = {
    session,
    player: bootstrap.data?.player.id ?? "unverified",
    season: bootstrap.data?.season.id ?? "unavailable",
    config: bootstrap.data?.remote ? configCacheScope(bootstrap.data.remote.config) : source,
  };
  const scopeKey = JSON.stringify(scope);
  const verifiedAnalyticsPlayer = source === "remote" && launchState === "ready" && adapter.isTelegram
    && bootstrap.isSuccess && !bootstrap.isPlaceholderData && bootstrap.data?.remote ? bootstrap.data.player.id : null;
  // Keep the privacy boundary outside the keyed child tree, so a session change
  // stops recording even while the next authenticated screen is being prepared.
  useLayoutEffect(() => { analytics.setPlayer(verifiedAnalyticsPlayer, session); }, [verifiedAnalyticsPlayer, session]);
  const [prepared, setPrepared] = useState("");

  useEffect(() => {
    // Cancel old in-flight requests and remove caches for prior credentials/Seasons.
    const old = (query: { queryKey: readonly unknown[] }) =>
      (query.queryKey[0] === "bootstrap" && query.queryKey[1] !== session)
      || (query.queryKey[0] === "player" && JSON.stringify(query.queryKey.slice(1, 5)) !== JSON.stringify([scope.session, scope.player, scope.season, scope.config]));
    const hashes = new Set(client.getQueryCache().findAll({ predicate: old }).map((query) => query.queryHash));
    const captured = (query: { queryHash: string }) => hashes.has(query.queryHash);
    void client.cancelQueries({ predicate: captured }).then(() => client.removeQueries({ predicate: captured }));
  }, [client, session, scopeKey]);

  useLayoutEffect(() => {
    if (source === "remote" && bootstrap.data) {
      // Completion is a UX preference per validated player, never an auth credential.
      const key = `dalexio-onboarding-v1:player:${bootstrap.data.player.id}`;
      if (useOnboardingStore.persist.getOptions().name !== key) {
        let saved: string | null = null;
        try { saved = readPlayerOnboarding(localStorage, bootstrap.data.player.id); } catch { /* storage is optional */ }
        useOnboardingStore.persist.setOptions({ name: key });
        try { useOnboardingStore.getState().reset(); } catch { /* Optional preference persistence must not prevent session diagnosis. */ }
        if (saved) {
          try { localStorage.setItem(key, saved); void useOnboardingStore.persist.rehydrate(); } catch { /* keep fresh onboarding */ }
        }
      }
    }
    setPrepared(scopeKey);
  }, [scopeKey, source]);

  const refresh = () => bootstrap.refetch();
  const denyEarning = () => {
    // Cancel a Bootstrap read started before the rejection. Only a subsequent
    // authenticated response may restore permission; local controls cannot do so.
    revalidateAuthority();
  };
  return <Context.Provider value={{ bootstrap, scope, refresh, denyEarning, authorityReady: authorityReady && !bootstrap.isError, progressionPolicy: bootstrap.data?.remote?.config.progression ?? null }}>
    {prepared === scopeKey ? <div key={scopeKey} style={{ display: "contents" }}>{children}</div> : null}
  </Context.Provider>;
}
export function useBootstrap() {
  const value = useContext(Context);
  if (!value) throw new Error("useBootstrap must be used inside BootstrapProvider");
  return value;
}
