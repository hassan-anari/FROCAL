import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import { createTapPort } from "@/integrations/api/tapV2";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { TapController, type TapView } from "./controller";
import { browserTapOwnership } from "./ownership";
import { bindTapLifecycle } from "./lifecycle";
import { createTapCacheBridge } from "./cacheBridge";
import { useTapView } from "./useTapView";
import { LevelUpReveal } from "@/features/earn/EarnOverlays";
import type { LevelUpEvent } from "@/game/earn/types";
import type { AssetKey } from "@/assets/registry";

const Context = createContext<{ view: TapView; touch: () => boolean; retry: () => Promise<void>; prepareReload: () => boolean; switchDevice: () => Promise<void> } | null>(null);
export const useTapSession = () => useContext(Context);
const assets: Record<string, AssetKey> = { newborn: "dexo.level01", explorer: "dexo.level05", connector: "dexo.level10", specialist: "dexo.level15", vanguard: "dexo.level20", legend: "dexo.level30" };

function Session({ controller, children, restart }: { controller: TapController; children: ReactNode; restart: () => void }) {
  const view = useTapView(controller);
  const { bootstrap } = useBootstrap();
  const observedLifetime = bootstrap.data?.player.lifetimeXp;
  useEffect(() => {
    // An independent Daily/Mission refresh has no Tap cursor. Read a coherent v2
    // snapshot rather than injecting a balance or inventing ordering evidence.
    const committed = controller.getSnapshot().committed;
    if (committed && observedLifetime !== undefined && observedLifetime !== committed.lifetime) void controller.resume();
  }, [controller, observedLifetime]);
  const event = useMemo<LevelUpEvent | null>(() => view.levelChange ? {
    id: `tap-level:${view.levelChange.sequence}`, previousLevel: view.levelChange.previousLevel,
    newLevel: view.levelChange.newLevel, evolution: view.levelChange.evolved,
    evolutionTitle: view.levelChange.evolved ? view.levelChange.stage[0].toUpperCase() + view.levelChange.stage.slice(1) : null,
    createdAt: new Date().toISOString(),
  } : null, [view.levelChange]);
  return <Context.Provider value={{ view, touch: () => controller.touch(), prepareReload: () => controller.prepareReload(),
    switchDevice: () => controller.switchToThisDevice(), retry: async () => {
    if (["storage-blocked", "session-busy", "terminal"].includes(view.status)) restart();
    else await controller.resume();
  } }}>
    {children}
    <LevelUpReveal event={event} onClose={() => controller.dismissLevelChange()} character={view.progression ? assets[view.progression.stage] : undefined} returnLabel="Continue" />
  </Context.Provider>;
}

export function TapSessionProvider({ children }: { children: ReactNode }) {
  const { bootstrap, scope, refresh } = useBootstrap();
  const { adapter, launchState } = useTelegram();
  const client = useQueryClient();
  const [attempt, setAttempt] = useState(0);
  const auth = adapter.getInitData();
  const key = JSON.stringify([scope, auth, attempt]); // Memory only; never serialized to storage/logs/query keys.
  const [session, setSession] = useState<{ key: string; controller: TapController } | null>(null);
  const enabled = isRemoteDataSource() && launchState === "ready" && Boolean(auth) && scope.player !== "unverified"
    && Boolean(bootstrap.data?.featureFlags.base_tap) && bootstrap.data?.remote?.gameplay?.reward_earning_allowed !== false;
  const configVersion = bootstrap.data?.remote?.config.version;
  useEffect(() => {
    if (!enabled) { setSession(null); return; }
    const bridge = createTapCacheBridge(client, scope);
    let refreshed = false;
    const controller = new TapController({ player: scope.player, storage: () => localStorage,
      ownership: browserTapOwnership(scope.player), port: createTapPort(scope.player, auth),
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
  if (!session || session.key !== key || !enabled) return children;
  return <Session controller={session.controller} restart={() => setAttempt((value) => value + 1)}>{children}</Session>;
}
