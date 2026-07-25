import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/design-system/primitives/Button";
import { StatusChip } from "@/design-system/primitives/StatusChip";
import { assetRegistry, listAssetsForPhase } from "@/assets/registry";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { content } from "@/content/en";
import styles from "./DiagnosticsPage.module.css";

export function DiagnosticsPage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter, colorScheme, stableHeight } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <span>Phase 0 / Foundation</span>
          <h1>{content.diagnostics.title}</h1>
          <p>{content.diagnostics.subtitle}</p>
        </div>
        <Button tone="secondary" onClick={() => navigate({ to: "/" })}>Back to world</Button>
      </header>

      <section className={styles.grid} aria-label="Foundation diagnostics">
        <article>
          <StatusChip>Runtime ready</StatusChip>
          <h2>Telegram adapter</h2>
          <dl>
            <div><dt>Platform</dt><dd>{adapter.platform}</dd></div>
            <div><dt>Theme</dt><dd>{colorScheme}</dd></div>
            <div><dt>Stable height</dt><dd>{Math.round(stableHeight)}px</dd></div>
            <div><dt>User</dt><dd>{adapter.getUser()?.username ?? "browser fallback"}</dd></div>
          </dl>
        </article>

        <article>
          <StatusChip>Registry ready</StatusChip>
          <h2>Asset system</h2>
          <dl>
            <div><dt>Manifest version</dt><dd>{assetRegistry.version}</dd></div>
            <div><dt>Total keys</dt><dd>{assetRegistry.assets.length}</dd></div>
            <div><dt>Phase 0 required</dt><dd>{listAssetsForPhase(0).length}</dd></div>
            <div><dt>Fallback</dt><dd>enabled</dd></div>
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

        <article>
          <StatusChip>Motion ready</StatusChip>
          <h2>Experience guardrails</h2>
          <ul>
            <li>Reduced motion respected</li>
            <li>Safe-area aware</li>
            <li>Stable Telegram viewport</li>
            <li>Browser fallback supported</li>
          </ul>
        </article>
      </section>

      <section className={styles.contract}>
        <span>Phase 0 completion contract</span>
        <h2>Ready to build the Dexo Land entry flow.</h2>
        <p>The next approved phase adds onboarding, Dexo acquisition, Base navigation and the first complete playable vertical slice.</p>
      </section>
    </main>
  );
}
