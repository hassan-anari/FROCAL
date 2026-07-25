import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  const { adapter, colorScheme, stableHeight, insets } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  useEffect(() => adapter.showBackButton(() => navigate({ to: "/" })), [adapter, navigate]);

  const safeArea = insets.contentSafeArea;

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span>Phase 0 / Foundation</span>
        <h1>{content.diagnostics.title}</h1>
        <p>{content.diagnostics.subtitle}</p>
      </header>

      <section className={styles.stack} aria-label="Foundation diagnostics">
        <article>
          <StatusChip>Runtime ready</StatusChip>
          <h2>Telegram adapter</h2>
          <dl>
            <div><dt>Runtime</dt><dd>{adapter.platform}</dd></div>
            <div><dt>Client</dt><dd>{adapter.getClientPlatform()}</dd></div>
            <div><dt>Theme</dt><dd>{colorScheme}</dd></div>
            <div><dt>Stable height</dt><dd>{Math.round(stableHeight)}px</dd></div>
            <div><dt>User</dt><dd>{adapter.getUser()?.username ?? adapter.getUser()?.first_name ?? "browser"}</dd></div>
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
          <StatusChip>Guardrails ready</StatusChip>
          <h2>Experience checks</h2>
          <ul>
            <li>Portrait-first product canvas</li>
            <li>Telegram stable viewport</li>
            <li>Telegram safe-area events</li>
            <li>Reduced motion respected</li>
            <li>Browser and Vercel preview fallback</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
