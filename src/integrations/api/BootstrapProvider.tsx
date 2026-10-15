import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(session, source, scenario, adapter.platform),
    queryFn: ({ signal }) => loadBootstrap(scenario, adapter.platform, initData, signal),
    enabled: source !== "remote" || launchState === "ready",
    refetchOnWindowFocus: source === "remote",
    refetchInterval: source === "remote" ? 60_000 : false,
  });
  const scope: PlayerScope = {
    session,
    player: bootstrap.data?.player.id ?? "unverified",
    season: bootstrap.data?.season.id ?? "unavailable",
    config: bootstrap.data?.remote ? configCacheScope(bootstrap.data.remote.config) : source,
  };
  const scopeKey = JSON.stringify(scope);
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
        try { saved = localStorage.getItem(key); } catch { /* storage is optional */ }
        useOnboardingStore.persist.setOptions({ name: key });
        useOnboardingStore.getState().reset();
        if (saved) {
          try { localStorage.setItem(key, saved); void useOnboardingStore.persist.rehydrate(); } catch { /* keep fresh onboarding */ }
        }
      }
    }
    setPrepared(scopeKey);
  }, [scopeKey, source]);

  const refresh = () => bootstrap.refetch();
  return <Context.Provider value={{ bootstrap, scope, refresh, progressionPolicy: bootstrap.data?.remote?.config.progression ?? null }}>
    {prepared === scopeKey ? <div key={scopeKey} style={{ display: "contents" }}>{children}</div> : null}
  </Context.Provider>;
}
export function useBootstrap() {
  const value = useContext(Context);
  if (!value) throw new Error("useBootstrap must be used inside BootstrapProvider");
  return value;
}
