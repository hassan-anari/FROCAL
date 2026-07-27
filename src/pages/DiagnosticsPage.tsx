import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatusChip } from "@/design-system/primitives/StatusChip";
import { Button } from "@/design-system/primitives/Button";
import { assetRegistry, listAssetsForPhase } from "@/assets/registry";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useBaseUiStore } from "@/game/ui/baseUiStore";
import { getTypingAttemptsRemaining, useEarnStore } from "@/game/earn/earnStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./DiagnosticsPage.module.css";

const returnPathKey = "dalexio-diagnostics-return-path";

type ReturnPath = "/" | "/onboarding" | "/base" | "/earn" | "/earn/typing" | "/clan" | "/arena" | "/profile";

export function DiagnosticsPage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const onboarding = useOnboardingStore();
  const criticalActionVisible = useBaseUiStore((state) => state.criticalActionVisible);
  const promoBannerVisible = useBaseUiStore((state) => state.promoBannerVisible);
  const toggleCriticalAction = useBaseUiStore((state) => state.toggleCriticalAction);
  const togglePromoBanner = useBaseUiStore((state) => state.togglePromoBanner);
  const earn = useEarnStore();
  const { adapter, colorScheme, stableHeight, insets } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  useEffect(() => {
    const returnPath = (sessionStorage.getItem(returnPathKey) ?? "/base") as ReturnPath;
    return adapter.showBackButton(() => navigate({ to: returnPath }));
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
        <span>Phase 3.1 / Earn, Network & Typing</span>
        <h1>System diagnostics</h1>
        <p>Runtime, Base-state and repeatable Earn, Network and Typing controls.</p>
      </header>

      <section className={styles.stack} aria-label="Phase 3 diagnostics">
        <article>
          <StatusChip>Earn loop ready</StatusChip>
          <h2>Earn Center state</h2>
          <dl>
            <div><dt>Level</dt><dd>{earn.level}</dd></div>
            <div><dt>Level XP</dt><dd>{earn.levelXp} / {earn.xpToNextLevel}</dd></div>
            <div><dt>Lifetime XP</dt><dd>{earn.lifetimeXp.toLocaleString()}</dd></div>
            <div><dt>Daily streak</dt><dd>{earn.streak}</dd></div>
            <div><dt>Active missions</dt><dd>{Object.values(earn.missions).filter((mission) => mission.status !== "claimed").length}</dd></div>
            <div><dt>Typing plays left</dt><dd>{getTypingAttemptsRemaining(earn.typingAttemptDate, earn.typingAttempts)} / 5</dd></div>
            <div><dt>Verified referrals</dt><dd>{earn.verifiedReferrals}</dd></div>
            <div><dt>Active groups</dt><dd>{earn.activeGroups}</dd></div>
          </dl>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={earn.verifyReferral}>Verify referral</Button>
            <Button tone="secondary" size="sm" onClick={earn.verifyGroup}>Verify group</Button>
            <Button tone="secondary" size="sm" onClick={earn.completeStarterPathForDiagnostics}>Complete missions</Button>
            <Button tone="secondary" size="sm" onClick={earn.setNearEvolutionForDiagnostics}>Near evolution</Button>
            <Button tone="secondary" size="sm" onClick={earn.resetEarnProgress}>Reset Earn</Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: "/earn" })}>Open Earn</Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: "/earn/typing" })}>Open typing</Button>
          </div>
        </article>

        <article>
          <StatusChip>Base controls ready</StatusChip>
          <h2>Dynamic Base content</h2>
          <dl>
            <div><dt>Critical action</dt><dd>{criticalActionVisible ? "visible" : "hidden"}</dd></div>
            <div><dt>Promo banner</dt><dd>{promoBannerVisible ? "visible" : "hidden"}</dd></div>
            <div><dt>Banner source</dt><dd>1200 × 260</dd></div>
            <div><dt>Notification samples</dt><dd>4</dd></div>
            <div><dt>Season shortcut</dt><dd>triple tap</dd></div>
          </dl>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={toggleCriticalAction}>
              {criticalActionVisible ? "Hide critical action" : "Show critical action"}
            </Button>
            <Button tone="secondary" size="sm" onClick={togglePromoBanner}>
              {promoBannerVisible ? "Hide promo banner" : "Show promo banner"}
            </Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: "/base" })}>
              Open Base
            </Button>
          </div>
        </article>

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
            <Button tone="secondary" size="sm" onClick={resetJourney}>Reset journey</Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: onboarding.status === "completed" ? "/base" : "/onboarding" })}>Open experience</Button>
          </div>
        </article>

        <article>
          <StatusChip>Shell ready</StatusChip>
          <h2>Main navigation</h2>
          <dl>
            <div><dt>Base</dt><dd>active</dd></div>
            <div><dt>Earn</dt><dd>playable</dd></div>
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
            <div><dt>Phase 3 registry</dt><dd>{listAssetsForPhase(3).length}</dd></div>
            <div><dt>Character pack</dt><dd>external</dd></div>
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
