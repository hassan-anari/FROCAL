import { useGameplayAvailability } from "@/integrations/api/useGameplayAvailability";
import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import { createTapPort } from "@/integrations/api/tapV2";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { TapController, type TapView } from "./controller";
import { browserTapOwnership } from "./ownership";
import { bindTapLifecycle } from "./lifecycle";
import { createTapCacheBridge } from "./cacheBridge";
import { LevelUpReveal } from "@/features/earn/EarnOverlays";
import type { LevelUpEvent } from "@/game/earn/types";
import type { AssetKey } from "@/assets/registry";

const Context = createContext<{ view: TapView; touch: () => boolean; retry: () => Promise<void>; prepareReload: () => boolean; switchDevice: () => Promise<void> } | null>(null);
export const useTapSession = () => useContext(Context);
const assets: Record<string, AssetKey> = { newborn: "dexo.level01", explorer: "dexo.level05", connector: "dexo.level10", specialist: "dexo.level15", vanguard: "dexo.level20", legend: "dexo.level30" };

const emptySubscribe = () => () => {};
const emptySnapshot = () => null;

function Session({ controller, children, restart }: { controller: TapController | null; children: ReactNode; restart: () => void }) {
  const view = useSyncExternalStore<TapView | null>(controller?.subscribe ?? emptySubscribe, controller?.getSnapshot ?? emptySnapshot, controller?.getSnapshot ?? emptySnapshot);
  const { bootstrap } = useBootstrap();
  const observedLifetime = bootstrap.data?.player.lifetimeXp;
  useEffect(() => {
    // An independent Daily/Mission refresh has no Tap cursor. Read a coherent v2
    // snapshot rather than injecting a balance or inventing ordering evidence.
    const committed = controller?.getSnapshot().committed;
    if (committed && observedLifetime !== undefined && observedLifetime !== committed.lifetime) controller?.requestCanonicalRefresh();
  }, [controller, observedLifetime]);
  const event = useMemo<LevelUpEvent | null>(() => view?.levelChange ? {
    id: `tap-level:${view.levelChange.sequence}`, previousLevel: view.levelChange.previousLevel,
    newLevel: view.levelChange.newLevel, evolution: view.levelChange.evolved,
    evolutionTitle: view.levelChange.evolved ? view.levelChange.stage[0].toUpperCase() + view.levelChange.stage.slice(1) : null,
    createdAt: new Date().toISOString(),
  } : null, [view?.levelChange]);
  return <Context.Provider value={view && controller ? { view, touch: () => controller.touch(), prepareReload: () => controller.prepareReload(),
    switchDevice: () => controller.switchToThisDevice(), retry: async () => {
    if (["storage-blocked", "session-busy", "terminal"].includes(view.status)) restart();
    else await controller.resume();
  } } : null}>
    {children}
    <LevelUpReveal event={event} onClose={() => controller?.dismissLevelChange()} character={view?.progression ? assets[view.progression.stage] : undefined} returnLabel="Continue" />
  </Context.Provider>;
}

export function TapSessionProvider({ children }: { children: ReactNode }) {
  const { bootstrap, scope, refresh } = useBootstrap();
  const { adapter, launchState } = useTelegram();
  const client = useQueryClient();
  const { canEarn } = useGameplayAvailability();
  const [attempt, setAttempt] = useState(0);
  const auth = adapter.getInitData();
  const key = JSON.stringify([scope, auth, attempt]); // Memory only; never serialized to storage/logs/query keys.
  const [session, setSession] = useState<{ key: string; controller: TapController } | null>(null);
  // Input authority may end while an exact durable request is awaiting its receipt.
  // Keep reconciliation alive for this authenticated scope; only identity turnover closes it.
  const enabled = isRemoteDataSource() && launchState === "ready" && Boolean(auth) && scope.player !== "unverified" && Boolean(bootstrap.data);
  const earningAllowed = canEarn("base_tap");
  const configVersion = bootstrap.data?.remote?.config.version;
  useEffect(() => {
    if (!enabled) { setSession(null); return; }
    const bridge = createTapCacheBridge(client, scope);
    let refreshed = false;
    const controller = new TapController({ player: scope.player, storage: () => localStorage,
      ownership: browserTapOwnership(scope.player), port: createTapPort(scope.player, auth, [scope.player], () => canEarn("base_tap")),
      canEarn: () => canEarn("base_tap"),
      onCommitted: (snapshot) => {
        if ((snapshot.season !== scope.season || snapshot.config !== configVersion) && !refreshed) { refreshed = true; refresh(); }
        bridge(snapshot);
      },
    });
    setSession({ key, controller });
    void controller.start();
    return bindTapLifecycle(controller);
    // Scope/credential turnover replaces and closes the entire authenticated controller.
  }, [key, enabled]);
  useEffect(() => {
    if (session?.key === key && !earningAllowed) session.controller.requestCanonicalRefresh();
  }, [session, key, earningAllowed]);
  // Keep the same provider ancestry when earning stops; preserve the current tab/scroll.
  return <Session controller={session?.key === key && enabled ? session.controller : null} restart={() => setAttempt((value) => value + 1)}>{children}</Session>;
}
