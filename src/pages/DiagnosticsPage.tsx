import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatusChip } from "@/design-system/primitives/StatusChip";
import { Button } from "@/design-system/primitives/Button";
import { assetRegistry, listAssetsForPhase } from "@/assets/registry";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./DiagnosticsPage.module.css";

const returnPathKey = "dalexio-diagnostics-return-path";

export function DiagnosticsPage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const onboarding = useOnboardingStore();
  const { adapter, colorScheme, stableHeight, insets } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  useEffect(() => {
    const returnPath = sessionStorage.getItem(returnPathKey) ?? "/";
    return adapter.showBackButton(() => navigate({ to: returnPath as "/" | "/onboarding" | "/base" }));
  }, [adapter, navigate]);

  const safeArea = insets.contentSafeArea;

  const resetJourney = () => {
    onboarding.reset();
    adapter.hapticNotice("warning");
    sessionStorage.setItem(returnPathKey, "/onboarding");
    void navigate({ to: "/onboarding" });
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span>Phase 2 / App Shell</span>
        <h1>System diagnostics</h1>
        <p>Runtime, navigation and shell diagnostics.</p>
      </header>

      <section className={styles.stack} aria-label="Phase 1 diagnostics">
        <article>
          <StatusChip>Journey ready</StatusChip>
          <h2>Onboarding state</h2>
          <dl>
            <div><dt>Status</dt><dd>{onboarding.status}</dd></div>
            <div><dt>Scene</dt><dd>{onboarding.step}</dd></div>
            <div><dt>Dexo acquired</dt><dd>{onboarding.status === "dexo-acquired" || onboarding.status === "completed" ? "yes" : "no"}</dd></div>
            <div><dt>Completed</dt><dd>{onboarding.completedAt ? "yes" : "no"}</dd></div>
          </dl>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={resetJourney}>
              Reset journey
            </Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: onboarding.status === "completed" ? "/base" : "/onboarding" })}>
              Open experience
            </Button>
          </div>
        </article>

        <article>
          <StatusChip>Shell ready</StatusChip>
          <h2>Main navigation</h2>
          <dl>
            <div><dt>Base</dt><dd>active</dd></div>
            <div><dt>Earn</dt><dd>active</dd></div>
            <div><dt>Clan</dt><dd>reserved</dd></div>
            <div><dt>Arena</dt><dd>reserved</dd></div>
            <div><dt>Profile</dt><dd>active</dd></div>
          </dl>
        </article>

        <article>
          <StatusChip>Runtime ready</StatusChip>
          <h2>Telegram adapter</h2>
          <dl>
            <div><dt>Runtime</dt><dd>{adapter.platform}</dd></div>
            <div><dt>Client</dt><dd>{adapter.getClientPlatform()}</dd></div>
            <div><dt>Theme</dt><dd>{colorScheme}</dd></div>
            <div><dt>Stable height</dt><dd>{Math.round(stableHeight)}px</dd></div>
            <div><dt>User</dt><dd>{adapter.getUser()?.first_name ?? "browser"}</dd></div>
            <div><dt>Start param</dt><dd>{adapter.getStartParam() ?? "—"}</dd></div>
          </dl>
        </article>

        <article>
          <StatusChip>Safe area ready</StatusChip>
          <h2>Viewport insets</h2>
          <dl>
            <div><dt>Top</dt><dd>{safeArea.top}px</dd></div>
            <div><dt>Right</dt><dd>{safeArea.right}px</dd></div>
            <div><dt>Bottom</dt><dd>{safeArea.bottom}px</dd></div>
            <div><dt>Left</dt><dd>{safeArea.left}px</dd></div>
          </dl>
        </article>

        <article>
          <StatusChip>Registry ready</StatusChip>
          <h2>Asset system</h2>
          <dl>
            <div><dt>Manifest version</dt><dd>{assetRegistry.version}</dd></div>
            <div><dt>Total keys</dt><dd>{assetRegistry.assets.length}</dd></div>
            <div><dt>Phase 2 registry</dt><dd>{listAssetsForPhase(2).length}</dd></div>
            <div><dt>Character pack</dt><dd>25 files</dd></div>
          </dl>
        </article>

        <article>
          <StatusChip>Mock ready</StatusChip>
          <h2>Bootstrap contract</h2>
          <dl>
            <div><dt>Scenario</dt><dd>{scenario}</dd></div>
            <div><dt>Status</dt><dd>{bootstrap.status}</dd></div>
            <div><dt>Data source</dt><dd>{import.meta.env.VITE_DATA_SOURCE ?? "local"}</dd></div>
            <div><dt>Schema</dt><dd>Zod validated</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
