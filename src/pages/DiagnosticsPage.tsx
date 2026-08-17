import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StatusChip } from "@/design-system/primitives/StatusChip";
import { Button } from "@/design-system/primitives/Button";
import {
  getMobilePerformanceSnapshot,
  mobilePerformanceSampleEvent,
  resetMobilePerformanceMetrics,
  setMobilePerformanceMonitorEnabled,
  type MobilePerfSnapshot,
} from "@/design-system/performance/mobilePerf";
import { assetRegistry, listAssetsForPhase } from "@/assets/registry";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useBaseUiStore } from "@/game/ui/baseUiStore";
import { getTypingAttemptsRemaining, useEarnStore } from "@/game/earn/earnStore";
import { useProfileStore } from "@/game/profile/profileStore";
import { useClanStore } from "@/game/clan/clanStore";
import { useArenaWarStore } from "@/game/arena/arenaStore";
import type { ArenaHubSection, ArenaWarResult, ArenaWarStatus } from "@/game/arena/types";
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
  const profile = useProfileStore();
  const clan = useClanStore();
  const arena = useArenaWarStore();
  const { adapter, colorScheme, stableHeight, insets, isFullscreen, isMobileClient } = useTelegram();
  const [perfSnapshot, setPerfSnapshot] = useState<MobilePerfSnapshot>(() => getMobilePerformanceSnapshot());
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  useEffect(() => {
    const returnPath = (sessionStorage.getItem(returnPathKey) ?? "/base") as ReturnPath;
    return adapter.showBackButton(() => navigate({ to: returnPath }));
  }, [adapter, navigate]);

  useEffect(() => {
    const refresh = () => setPerfSnapshot(getMobilePerformanceSnapshot());
    window.addEventListener(mobilePerformanceSampleEvent, refresh);
    refresh();
    return () => window.removeEventListener(mobilePerformanceSampleEvent, refresh);
  }, []);

  const safeArea = insets.contentSafeArea;
  const recentPerfSamples = perfSnapshot.samples.slice(0, 5);
  const averageInputToFrame = recentPerfSamples.length > 0
    ? recentPerfSamples.reduce((sum, sample) => sum + sample.inputToFrameMs, 0) / recentPerfSamples.length
    : 0;
  const recentDroppedFrames = recentPerfSamples.reduce((sum, sample) => sum + sample.droppedFrames, 0);
  const recentLongTasks = recentPerfSamples.reduce((sum, sample) => sum + sample.longTaskCount, 0);

  const resetJourney = () => {
    onboarding.reset();
    adapter.hapticNotice("warning");
    sessionStorage.setItem(returnPathKey, "/onboarding");
    void navigate({ to: "/onboarding" });
  };

  const openArena = (section: ArenaHubSection) => {
    arena.setHubSection(section);
    adapter.selectionChanged();
    sessionStorage.setItem(returnPathKey, "/arena");
    void navigate({ to: "/arena" });
  };

  const openSeasonOneArena = () => {
    arena.openSeason1Public();
    openArena("overview");
  };

  const prepareSeasonTwoCaptain = () => {
    clan.setCaptainHeadquartersForDiagnostics();
    arena.openSeason2Diagnostics();
  };

  const openCaptainOverview = () => {
    prepareSeasonTwoCaptain();
    openArena("overview");
  };

  const openCaptainTargeting = () => {
    prepareSeasonTwoCaptain();
    arena.openTargeting();
    openArena("war");
  };

  const openCaptainPreview = () => {
    prepareSeasonTwoCaptain();
    arena.selectOpponent("void-runners");
    openArena("war");
  };

  const openCaptainPreparation = () => {
    prepareSeasonTwoCaptain();
    arena.selectOpponent("void-runners");
    arena.beginPreparation();
    openArena("war");
  };

  const openCaptainAttack = () => {
    prepareSeasonTwoCaptain();
    arena.showAttackForDiagnostics();
    openArena("war");
  };

  const openCaptainDefence = () => {
    prepareSeasonTwoCaptain();
    arena.showDefenceForDiagnostics();
    openArena("war");
  };

  const openSoldierWar = (direction: "attack" | "defence") => {
    clan.setSoldierMemberForDiagnostics();
    arena.openSeason2Diagnostics();
    if (direction === "attack") arena.showAttackForDiagnostics();
    else arena.showDefenceForDiagnostics();
    openArena("war");
  };

  const openArenaResult = (result: ArenaWarResult) => {
    prepareSeasonTwoCaptain();
    arena.showResultForDiagnostics(result);
    openArena("war");
  };

  const openArenaStatus = (status: ArenaWarStatus) => {
    prepareSeasonTwoCaptain();
    arena.showStatusForDiagnostics(status);
    openArena("war");
  };

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <span>Phase 6 / Arena Frontend</span>
        <h1>System diagnostics</h1>
        <p>Runtime, game-loop and repeatable Arena, Clan, Profile and Earn scenario controls.</p>
      </header>

      <section className={styles.stack} aria-label="Phase 6 diagnostics">
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
          <StatusChip>Profile ready</StatusChip>
          <h2>Profile & Identity state</h2>
          <dl>
            <div><dt>Frame</dt><dd>{profile.activeFrameId}</dd></div>
            <div><dt>Title</dt><dd>{profile.activeTitleId}</dd></div>
            <div><dt>Achievements</dt><dd>{profile.unlockedAchievementIds.length} / 10</dd></div>
            <div><dt>Medals</dt><dd>{profile.unlockedMedalIds.length} / 10</dd></div>
            <div><dt>Wallet</dt><dd>{profile.walletStatus}</dd></div>
            <div><dt>Dalexio account</dt><dd>{profile.dalexioStatus}</dd></div>
          </dl>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={profile.unlockCommunityActivity}>Verified activity</Button>
            <Button tone="secondary" size="sm" onClick={profile.unlockWarJourney}>War journey</Button>
            <Button tone="secondary" size="sm" onClick={profile.setChampionProfile}>Champion profile</Button>
            <Button tone="secondary" size="sm" onClick={profile.unlockAllProfileItems}>Unlock all</Button>
            <Button tone="secondary" size="sm" onClick={profile.resetProfile}>Reset Profile</Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: "/profile" })}>Open Profile</Button>
          </div>
        </article>

        <article>
          <StatusChip>Clan frontend ready</StatusChip>
          <h2>Clan scenario controls</h2>
          <dl>
            <div><dt>Player level</dt><dd>{earn.level}</dd></div>
            <div><dt>Role</dt><dd>{clan.role ?? "not chosen"}</dd></div>
            <div><dt>Membership</dt><dd>{clan.membership}</dd></div>
            <div><dt>Join request</dt><dd>{clan.joinRequestState}</dd></div>
            <div><dt>Active clan</dt><dd>{clan.activeClanId ?? "—"}</dd></div>
            <div><dt>Treasury</dt><dd>{clan.treasury.toLocaleString()}</dd></div>
          </dl>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={() => { earn.setLevelForDiagnostics(4); clan.resetClan(); }}>Locked · L4</Button>
            <Button tone="secondary" size="sm" onClick={() => { earn.setLevelForDiagnostics(5); clan.resetClan(); }}>Role choice · L5</Button>
            <Button tone="secondary" size="sm" onClick={() => { earn.setLevelForDiagnostics(5); clan.setSoldierDiscoveryForDiagnostics(); }}>Soldier discovery</Button>
            <Button tone="secondary" size="sm" onClick={() => { earn.setLevelForDiagnostics(5); clan.setSoldierPendingForDiagnostics(); }}>Soldier pending</Button>
            <Button tone="secondary" size="sm" onClick={() => { earn.setLevelForDiagnostics(5); clan.setSoldierMemberForDiagnostics(); }}>Soldier HQ</Button>
            <Button tone="secondary" size="sm" onClick={() => { earn.setLevelForDiagnostics(5); clan.setCaptainHeadquartersForDiagnostics(); }}>Captain HQ</Button>
            <Button tone="secondary" size="sm" onClick={clan.rejectCurrentJoinForDiagnostics}>Reject current request</Button>
            <Button tone="secondary" size="sm" onClick={clan.acceptCurrentJoinForDiagnostics}>Accept current request</Button>
            <Button tone="secondary" size="sm" onClick={() => navigate({ to: "/clan" })}>Open Clan</Button>
          </div>
        </article>

        <article>
          <StatusChip>Arena Phase 6 ready</StatusChip>
          <h2>Arena / Warfront scenarios</h2>
          <dl>
            <div><dt>Experience</dt><dd>{arena.experienceMode === "season1" ? "Season 1 public" : "Season 2 diagnostics"}</dd></div>
            <div><dt>Role</dt><dd>{clan.role ?? "none"}</dd></div>
            <div><dt>Arena section</dt><dd>{arena.hubSection}</dd></div>
            <div><dt>War scenario</dt><dd>{arena.scenario}</dd></div>
            <div><dt>Direction</dt><dd>{arena.direction}</dd></div>
            <div><dt>Your progress</dt><dd>{arena.battleProgress}%</dd></div>
            <div><dt>Rival progress</dt><dd>{arena.enemyProgress}%</dd></div>
          </dl>

          <h2>Public Season 1</h2>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={openSeasonOneArena}>Open Season 1 Arena</Button>
          </div>

          <h2>Season 2 · Captain scenarios</h2>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={openCaptainOverview}>Captain overview</Button>
            <Button tone="secondary" size="sm" onClick={openCaptainTargeting}>Target browser</Button>
            <Button tone="secondary" size="sm" onClick={openCaptainPreview}>Opponent preview</Button>
            <Button tone="secondary" size="sm" onClick={openCaptainPreparation}>Attack preparation</Button>
            <Button tone="secondary" size="sm" onClick={openCaptainAttack}>Active attack</Button>
            <Button tone="secondary" size="sm" onClick={openCaptainDefence}>Under attack · Captain</Button>
          </div>

          <h2>Season 2 · Soldier scenarios</h2>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={() => { clan.setSoldierMemberForDiagnostics(); arena.openSeason2Diagnostics(); openArena("overview"); }}>Soldier overview</Button>
            <Button tone="secondary" size="sm" onClick={() => openSoldierWar("attack")}>Soldier · attacking</Button>
            <Button tone="secondary" size="sm" onClick={() => openSoldierWar("defence")}>Soldier · defending</Button>
          </div>

          <h2>Season 2 · Persistent views</h2>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={() => { prepareSeasonTwoCaptain(); openArena("history"); }}>War history</Button>
            <Button tone="secondary" size="sm" onClick={() => { arena.openSeason2Diagnostics(); openArena("rankings"); }}>Rankings</Button>
          </div>

          <h2>War result states</h2>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={() => openArenaResult("victory")}>Victory</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaResult("defeat")}>Defeat</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaResult("draw")}>Draw</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaResult("successfulAttack")}>Successful attack</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaResult("successfulDefence")}>Successful defence</Button>
          </div>

          <h2>Post-war status</h2>
          <div className={styles.actions}>
            <Button tone="secondary" size="sm" onClick={() => openArenaStatus("protection")}>Protection active</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaStatus("recovery")}>Recovery mode</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaStatus("reward")}>Reward ready</Button>
            <Button tone="secondary" size="sm" onClick={() => openArenaStatus("debuff")}>Temporary debuff</Button>
            <Button tone="secondary" size="sm" onClick={openSeasonOneArena}>Open public Arena</Button>
          </div>
        </article>

        <article>
          <StatusChip>{perfSnapshot.enabled ? "Mobile perf recording" : "Mobile perf ready"}</StatusChip>
          <h2>Mobile interaction performance</h2>
          <dl>
            <div><dt>Recorder</dt><dd>{perfSnapshot.enabled ? "ON" : "OFF"}</dd></div>
            <div><dt>Interaction window</dt><dd>450ms</dd></div>
            <div><dt>Frame budget</dt><dd>~{perfSnapshot.estimatedFrameBudgetMs.toFixed(1)}ms</dd></div>
            <div><dt>Recent samples</dt><dd>{perfSnapshot.samples.length}</dd></div>
            <div><dt>Avg tap → frame</dt><dd>{averageInputToFrame ? `${averageInputToFrame.toFixed(1)}ms` : "—"}</dd></div>
            <div><dt>Worst interaction gap</dt><dd>{perfSnapshot.worstInteractionFrameGapMs ? `${perfSnapshot.worstInteractionFrameGapMs.toFixed(1)}ms` : "—"}</dd></div>
            <div><dt>Dropped · latest 5</dt><dd>{recentDroppedFrames}</dd></div>
            <div><dt>Long tasks · latest 5</dt><dd>{recentLongTasks}</dd></div>
            <div><dt>Long tasks · total</dt><dd>{perfSnapshot.totalLongTaskCount}</dd></div>
            <div><dt>Worst long task</dt><dd>{perfSnapshot.worstLongTaskMs ? `${perfSnapshot.worstLongTaskMs.toFixed(1)}ms` : "unsupported / none"}</dd></div>
          </dl>
          {recentPerfSamples.length > 0 ? (
            <>
              <h2>Latest interactions · full 450ms</h2>
              <dl>
                {recentPerfSamples.map((sample) => (
                  <div key={sample.id}>
                    <dt>{sample.label}</dt>
                    <dd>tap {sample.inputToFrameMs.toFixed(1)} · max {sample.maxFrameGapMs.toFixed(1)} · drop {sample.droppedFrames} · LT {sample.longTaskCount ? `${sample.worstLongTaskMs.toFixed(0)}ms` : "0"}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
          <div className={styles.actions}>
            <Button
              tone="secondary"
              size="sm"
              onClick={() => setMobilePerformanceMonitorEnabled(!perfSnapshot.enabled)}
            >
              {perfSnapshot.enabled ? "Stop recorder" : "Start recorder"}
            </Button>
            <Button tone="secondary" size="sm" onClick={resetMobilePerformanceMetrics}>Reset metrics</Button>
          </div>
          <p>Each sample follows the full 450ms after pointer-down. “max” is the worst frame gap inside that interaction, “drop” estimates missed refresh frames using the detected phone cadence, and “LT” is the worst attributed long task.</p>
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
            <div><dt>Clan</dt><dd>active frontend</dd></div>
            <div><dt>Arena</dt><dd>Phase 6 active</dd></div>
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
            <div><dt>Fullscreen</dt><dd>{isFullscreen ? "yes" : "no"}</dd></div>
            <div><dt>Layout policy</dt><dd>{isMobileClient ? "mobile fullscreen" : "desktop native fullsize"}</dd></div>
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
            <div><dt>Phase 4 registry</dt><dd>{listAssetsForPhase(4).length}</dd></div>
            <div><dt>Phase 6 registry</dt><dd>{listAssetsForPhase(6).length}</dd></div>
            <div><dt>Profile pack</dt><dd>31 assets</dd></div>
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
