import { readSessionPreference, writeSessionPreference } from "@/app/storageRelease";
import { useB3, missionView } from "@/integrations/api/useB3";
import { safeDestination } from "@/integrations/api/safeNavigation";
import { useGameplayAvailability } from "@/integrations/api/useGameplayAvailability";
import { AvatarContent } from "@/design-system/components/AvatarContent";
import { navigateSafely } from "@/integrations/api/safeNavigation";
import { usePlayerProgression } from "@/integrations/api/usePlayerProgression";
import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  CoinsDollarIcon,
  KeyboardIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { Button } from "@/design-system/primitives/Button";
import { DeferredMount } from "@/design-system/performance/DeferredMount";
import { HistorySheet, LevelUpReveal, NetworkGuideSheet, RewardReveal, type NetworkGuideKind } from "@/features/earn/EarnOverlays";
import {
  TYPING_DAILY_LIMIT,
  getStarterPathProgress,
  getTypingAttemptsRemaining,
  getTypingAttemptsToday,
  isDailyClaimAvailable,
  useEarnStore,
} from "@/game/earn/earnStore";
import type { EarnMission, MissionId } from "@/game/earn/types";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import styles from "./EarnPage.module.css";

type EarnTab = "earn" | "network" | "typing";
const earnTabStorageKey = "dalexio-earn-active-tab";

const tabs = [
  { id: "earn", label: "Earn", icon: CoinsDollarIcon },
  { id: "network", label: "Network", icon: UserGroupIcon },
  { id: "typing", label: "Typing", icon: KeyboardIcon },
] as const;

const missionNumber: Record<MissionId, string> = {
  "visit-dalexio": "01",
  "view-x-update": "02",
  "join-telegram": "03",
  "typing-session": "04",
  "complete-profile": "05",
  "read-season-brief": "06",
};

const missionTone: Record<MissionId, "cyan" | "violet" | "gold"> = {
  "visit-dalexio": "cyan",
  "view-x-update": "violet",
  "join-telegram": "gold",
  "typing-session": "violet",
  "complete-profile": "cyan",
  "read-season-brief": "gold",
};

function statusLabel(mission: EarnMission): string {
  if (mission.status === "claimed") return "Completed";
  if (mission.status === "completed") return "Reward ready";
  if (mission.status === "in-progress") return "Pending check";
  return "Available";
}

function missionActionLabel(mission: EarnMission, remote = false): string {
  if (remote && mission.status === "in-progress") return "Verify";
  if (mission.status === "claimed") return "Completed";
  if (mission.status === "completed") return `Claim ${mission.rewardXp} XP`;
  if (mission.action === "typing") return mission.status === "in-progress" ? "Enter Typing Arena" : "Open Typing Arena";
  if (mission.status === "in-progress") return "Verify";
  if (mission.action === "profile") return "Open profile";
  return "Start mission";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatResultTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function referralTier(referrals: number) {
  if (referrals >= 20) return "Gold";
  if (referrals >= 5) return "Silver";
  return "Bronze";
}

type ReferralRow = {
  id: string;
  name: string;
  level: number;
  status: "Active" | "Pending";
  invitedAt: string;
  tone: "cyan" | "violet" | "gold" | "blue" | "pink";
  earnedXp?: number;
  activation?: string;
  useTelegramPhoto?: boolean;
};

const demoReferralRows: readonly ReferralRow[] = [
  { id: "ref-1", name: "Aria Moon", level: 8, status: "Active", invitedAt: "Jul 25", earnedXp: 84, useTelegramPhoto: true, tone: "cyan" },
  { id: "ref-2", name: "Nova Reed", level: 6, status: "Active", invitedAt: "Jul 24", earnedXp: 56, tone: "violet" },
  { id: "ref-3", name: "Liam Cross", level: 4, status: "Pending", invitedAt: "Jul 23", activation: "Level 4 / 5", tone: "gold" },
  { id: "ref-4", name: "Mika Vale", level: 2, status: "Pending", invitedAt: "Jul 22", activation: "Level 2 / 5", tone: "blue" },
  { id: "ref-5", name: "Sora Lin", level: 1, status: "Pending", invitedAt: "Jul 21", activation: "Level 1 / 5", tone: "pink" },
];

const demoGroupRows = [
  { id: "group-1", name: "Dexo Explorers", members: 2840, admin: true, status: "Active", earnedXp: 1240, meta: "Active 12m ago", tone: "violet" },
  { id: "group-2", name: "Future Builders", members: 1120, admin: true, status: "Review", earnedXp: 0, meta: "Connected Jul 24", tone: "cyan" },
  { id: "group-3", name: "Web3 Creators", members: 7650, admin: false, status: "Needs admin", earnedXp: 0, meta: "Connected Jul 22", tone: "gold" },
] as const;

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function EarnPage() {
  const playerProgression = usePlayerProgression();
  const navigate = useNavigate();
  const { adapter } = useTelegram();
  const localEarn = useEarnStore();
  const live = useB3();
  const earn = live.remote ? { ...localEarn,
    missions: Object.fromEntries((live.missions.data ?? []).map(m => [m.key, missionView(m)])) as Record<string, EarnMission>,
    streak: live.daily.data?.current_streak ?? 0,
    referralCount: (live.referrals.data?.pending_count ?? 0) + (live.referrals.data?.verified_count ?? 0),
    verifiedReferrals: live.referrals.data?.verified_count ?? 0, referralXpEarned: live.referrals.data?.earned_points ?? 0,
    connectedGroups: live.network.data?.group_count ?? 0, activeGroups: live.network.data?.active_groups ?? 0, groupXpEarned: live.network.data?.earned_points ?? 0,
    typingBest: live.typing.data ? { wpm: live.typing.data.best_wpm, accuracy: live.typing.data.best_accuracy_bps / 100, score: 0, completedAt: "" } : null,
    history: [], rewardEvent: live.rewardEvent, levelUpEvent: live.levelUpEvent, dismissReward: live.dismissReward, dismissLevelUp: live.dismissLevelUp, referralSent: false, referralShares: 0,
  } : localEarn;
  const referralRows: readonly ReferralRow[] = live.remote ? (live.invitees.data?.items ?? []).slice(0,5).map((v, i) => ({ id: `${v.attributed_at}:${i}`, name: v.name, level: v.activation.level, status: v.status === "VERIFIED" ? "Active" : "Pending", invitedAt: new Date(v.attributed_at).toLocaleDateString("en-US"), tone: "cyan", activation: `Level ${v.activation.level} / ${v.activation.required_level} · ${v.activation.eligible ? "Eligible" : "Pending eligibility"}` })) : demoReferralRows;
  const groupRows = live.remote ? (live.groups.data?.items ?? []).map(v => ({ id: v.public_id, name: v.title, members: v.unique_speakers, admin: v.bot_admin, status: v.state.replaceAll("_", " "), earnedXp: v.earned_points, meta: `${v.qualified_characters} qualified characters · ${v.verification_retrying ? "Check pending" : v.creator_verified_at ? "Creator verified" : "Creator check pending"}`, tone: "cyan" })) : demoGroupRows;
  const typingMission = earn.missions["typing-session"];
  const typingLimit = live.remote ? live.typing.data?.attempt_limit ?? 0 : TYPING_DAILY_LIMIT;
  const { canEarn } = useGameplayAvailability();
  const [activeTab, setActiveTab] = useState<EarnTab>(() => {
    const stored = readSessionPreference(earnTabStorageKey);
    return stored === "network" || stored === "typing" ? stored : "earn";
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState<NetworkGuideKind | null>(null);
  const [copied, setCopied] = useState(false);

  const dailyAvailable = live.remote ? live.daily.data?.claimable === true : isDailyClaimAvailable(earn.lastClaimDate);
  const pathProgress = Object.keys(earn.missions).length ? Math.round(Object.values(earn.missions).filter(m => m.status === "claimed").length / Object.keys(earn.missions).length * 100) : 0;
  const claimedMissions = Object.values(earn.missions).filter((mission) => mission.status === "claimed").length;
  const activeMissions = Object.values(earn.missions).filter((mission) => mission.status !== "claimed");
  const completedMissions = Object.values(earn.missions).filter((mission) => mission.status === "claimed");
  const levelProgress = Math.min(100, Math.round((playerProgression.levelXp / playerProgression.xpToNextLevel) * 100));
  const typingToday = live.remote ? [] : getTypingAttemptsToday(earn.typingAttemptDate, earn.typingAttempts);
  const typingUsed = live.remote ? live.typing.data?.attempts_used ?? 0 : typingToday.length;
  const typingRemaining = live.remote ? live.typing.data?.attempts_remaining ?? 0 : getTypingAttemptsRemaining(earn.typingAttemptDate, earn.typingAttempts);
  const telegramUser = adapter.getUser();
  const referralCode = telegramUser?.id ?? "explorer";
  const referralLink = live.remote ? (live.referrals.data?.enabled && safeDestination(live.referrals.data.link)?.kind === "telegram" ? live.referrals.data.link ?? "" : "") : `https://t.me/DalexioBot?start=dexoairdrop_${referralCode}`;
  const groupLink = "https://t.me/DalexioBot?startgroup=dexoairdrop";
  const networkHistory = earn.history.filter((entry) => entry.type === "referral" || entry.type === "group").slice(0, 5);
  const tier = live.remote ? live.referrals.data?.current_tier ?? "No tier yet" : referralTier(earn.verifiedReferrals);

  useEffect(() => {
    void preloadAssets([
      "dexo.platform",
      "dexo.personalityFocused",
      "dexo.personalityVictory",
      "dexo.level05",
      "dexo.level10",
      "dexo.level15",
      "dexo.level20",
      "dexo.level30",
    ]);
  }, []);

  useEffect(() => {
    writeSessionPreference(earnTabStorageKey, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!live.remote || activeTab !== "network") return;
    let lastRefresh = 0;
    const revalidate = () => {
      if (document.hidden || Date.now() - lastRefresh < 1000) return;
      lastRefresh = Date.now();
      void Promise.all([live.referrals.refetch(), live.invitees.refetch(), live.network.refetch(), live.groups.refetch()]);
    };
    revalidate();
    window.addEventListener("focus", revalidate);
    document.addEventListener("visibilitychange", revalidate);
    return () => { window.removeEventListener("focus", revalidate); document.removeEventListener("visibilitychange", revalidate); };
  }, [activeTab, live.remote, live.referrals.refetch, live.invitees.refetch, live.network.refetch, live.groups.refetch]);

  const dailyNodes = useMemo(() => {
    const activeIndex = Math.max(0, Math.min(6, live.remote ? (live.daily.data?.cycle_day ?? 1) - 1 : earn.streak === 0 ? 0 : (earn.streak - 1) % 7));
    return Array.from({ length: 7 }, (_, index) => ({
      label: String(index + 1).padStart(2, "0"),
      complete: index < activeIndex || (!dailyAvailable && index === activeIndex),
      active: dailyAvailable && index === activeIndex,
    }));
  }, [dailyAvailable, earn.streak, live.remote, live.daily.data?.cycle_day]);

  const switchTab = (tab: EarnTab) => {
    if (tab === activeTab) return;
    adapter.selectionChanged();
    setActiveTab(tab);
  };

  const openTypingArena = () => {
    if (!canEarn("typing")) return;
    writeSessionPreference(earnTabStorageKey, "typing");
    startTransition(() => { void navigate({ to: "/earn/typing" }); });
  };

  const handleMissionAction = async (mission: EarnMission) => {
    if (live.remote) {
      if (!canEarn("missions")) return;
      const next = await live.missionAction(mission.id);
      if (next?.action === "typing") openTypingArena();
      else if (next?.action === "profile") void navigate({ to: "/profile" });
      else if (next?.destination) navigateSafely(next.destination, adapter, to => { void navigate({ to }); });
      return;
    }
    if (!canEarn("missions")) return;
    adapter.selectionChanged();
    if (mission.status === "claimed") return;
    if (mission.status === "completed") {
      earn.claimMission(mission.id);
      return;
    }
    if (mission.action === "typing") {
      if (mission.status === "available") earn.startMission(mission.id);
      setActiveTab("typing");
      return;
    }
    if (mission.status === "in-progress") {
      earn.completeMission(mission.id);
      return;
    }

    earn.startMission(mission.id);
    if (mission.action === "profile") {
      startTransition(() => { void navigate({ to: "/profile" }); });
      return;
    }
    if (mission.href) {
      navigateSafely(mission.href, adapter, (to) => { void navigate({ to }); });
    }
  };

  const claimDailyCore = () => {
    if (!dailyAvailable || !canEarn("daily")) return;
    adapter.hapticImpact("medium");
    if (live.remote) void live.claimDaily(); else earn.claimDaily();
  };

  const handleTypingMissionAction = () => {
    if (!canEarn("typing") || !canEarn("missions")) return;
    const mission = earn.missions["typing-session"];
    if (!mission) return;
    if (live.remote) { void handleMissionAction(mission); return; }
    if (mission.status === "claimed") return;
    if (mission.status === "completed") {
      earn.claimMission(mission.id);
      return;
    }
    if (mission.status === "available") earn.startMission(mission.id);
    openTypingArena();
  };


  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      if (!live.remote) earn.markReferralSent();
      adapter.hapticNotice("success");
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      adapter.hapticNotice("error");
    }
  };

  const shareReferral = () => {
    if (!live.remote) earn.markReferralSent();
    adapter.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me in Dexo Land and grow through the season together.")}`);
  };

  const addToGroup = () => {
    adapter.hapticImpact("light");
    if (live.remote) { void live.registerGroup().then(result => { if (result) navigateSafely(result.startgroup_url, adapter, to => { void navigate({ to }); }); }); }
    else adapter.openTelegramLink(groupLink);
  };

  const renderMission = (mission: EarnMission, index: number, compact = false) => (
    <article
      key={mission.id}
      className={`${styles.missionCard} ${styles[`mission_${(missionTone[mission.id] ?? "cyan")}`]} ${compact ? styles.missionCompact : ""}`}
    >
      <div className={styles.missionHeader}>
        <span className={styles.missionNumber}>{missionNumber[mission.id] ?? String(index + 1).padStart(2,"0")}</span>
        <div>
          <span>{mission.category}</span>
          <h3>{mission.title}</h3>
        </div>
        {mission.status !== "claimed" ? <em>{live.remote && "unavailable" in mission && mission.unavailable ? "Unavailable" : statusLabel(mission)}</em> : null}
      </div>
      {compact ? null : <p>{mission.description}</p>}
      <div className={styles.missionFooter}>
        <div className={styles.missionReward}><span>REWARD</span><strong>+{mission.rewardXp} XP</strong></div>
        <button
          type="button"
          className={styles.missionAction}
          disabled={mission.status === "claimed" || !canEarn("missions") || (live.remote && (live.isPending(`mission:${mission.id}`) || ("unavailable" in mission && Boolean(mission.unavailable))))}
          onClick={() => handleMissionAction(mission)}
        >
          <span>{live.isPending(`mission:${mission.id}`) ? "Please wait…" : missionActionLabel(mission, live.remote)}</span>
          {mission.status === "claimed" ? <i>✓</i> : <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} />}
        </button>
      </div>
    </article>
  );

  return (
    <>
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <span>EARN CENTER</span>
            <h1>Grow your journey.</h1>
            <p>Claim daily rewards, complete missions, expand your network and sharpen your skills.</p>
          </div>
          <button type="button" disabled={live.remote} title={live.remote ? "History is currently unavailable" : undefined} onClick={() => setHistoryOpen(true)}>
            History
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.7} />
          </button>
        </header>

        <nav className={styles.tabBar} aria-label="Earn sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? styles.tabActive : ""}
              onClick={() => switchTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <HugeiconsIcon icon={tab.icon} size={18} strokeWidth={activeTab === tab.id ? 1.9 : 1.55} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <motion.div
            key={activeTab}
            className={styles.tabContent}
            initial={{ opacity: .96 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: .98 }}
            transition={mobileMotion.tab}
          >
            {activeTab === "earn" ? (
              <>
                <section className={styles.dailyCard} aria-label="Daily claim">
                  <div className={styles.dailyGlow} aria-hidden="true" />
                  <header>
                    <div>
                      <span>DAILY CORE</span>
                      <h2>{live.remote && !live.daily.data ? "Daily reward unavailable." : dailyAvailable ? "Your reward is ready." : "Daily reward secured."}</h2>
                      <p>{live.remote && !live.daily.data ? "Please check your connection and try again." : dailyAvailable ? "Claim today’s XP and continue your streak." : "Return after the reset to extend your daily chain."}</p>
                    </div>
                    <strong>{live.remote ? live.daily.data ? `+${live.daily.data.reward_amount} XP` : "—" : "+40 XP"}</strong>
                  </header>

                  <div className={styles.dailyPath}>
                    {dailyNodes.map((node) => (
                      <span key={node.label} className={`${node.complete ? styles.dayComplete : ""} ${node.active ? styles.dayActive : ""}`}>
                        {node.complete ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={1.8} /> : node.label}
                      </span>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    disabled={!dailyAvailable || !canEarn("daily") || live.isPending("daily")}
                    trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />}
                    onClick={claimDailyCore}
                  >
                    {live.isPending("daily") ? "Please wait…" : live.remote && !live.daily.data ? "Unavailable" : dailyAvailable ? "Claim daily core" : "Claimed today"}
                  </Button>
                </section>

                <section className={styles.pathCard} aria-label="Starter Path progress">
                  <header>
                    <div><span>SEASON PATHWAY</span><h2>Starter Protocol</h2></div>
                    <strong>{claimedMissions}/{Object.keys(earn.missions).length}</strong>
                  </header>
                  <div className={styles.pathMeta}><span>Complete all starter missions</span><strong>{pathProgress}%</strong></div>
                  <div className={styles.pathTrack}><motion.i animate={{ scaleX: pathProgress / 100 }} initial={false} style={{ transformOrigin: "0 50%" }} transition={mobileMotion.reveal} /></div>
                  <div className={styles.levelMeta}><span>Level {playerProgression.level} progress</span><strong>{playerProgression.levelXp} / {playerProgression.xpToNextLevel} XP</strong></div>
                  <div className={styles.levelTrack}><motion.i animate={{ scaleX: levelProgress / 100 }} initial={false} style={{ transformOrigin: "0 50%" }} transition={mobileMotion.reveal} /></div>
                </section>

                <DeferredMount minHeight={360}>
                <section className={styles.missionsSection} aria-label="Active missions">
                  <header className={styles.sectionHeader}>
                    <div><span>AVAILABLE NOW</span><h2>Active Missions</h2></div>
                    <span>{activeMissions.length} active</span>
                  </header>
                  <div className={styles.missionList}>
                    {activeMissions.length ? activeMissions.map((mission, index) => renderMission(mission, index)) : (
                      <div className={styles.emptyState}><strong>{live.remote && !live.missions.data ? live.missions.isPending ? "Loading missions…" : "Missions unavailable." : "All missions cleared."}</strong><span>New objectives will appear here.</span></div>
                    )}
                  </div>
                </section>

                <section className={styles.missionsSection} aria-label="Completed missions">
                  <header className={styles.sectionHeader}>
                    <div><span>ARCHIVE</span><h2>Completed Missions</h2></div>
                    <span>{completedMissions.length} done</span>
                  </header>
                  <div className={styles.missionList}>
                    {completedMissions.length ? completedMissions.map((mission, index) => renderMission(mission, index, true)) : (
                      <div className={styles.emptyState}><strong>No completed missions yet.</strong><span>Claim a mission reward to move it into this section.</span></div>
                    )}
                  </div>
                </section>
                </DeferredMount>
              </>
            ) : null}

            {activeTab === "network" ? (
              <>
                <section className={styles.networkHero}>
                  <span className={styles.networkIcon}><HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.7} /></span>
                  <div><span>YOUR NETWORK</span><h2>Grow with people and groups.</h2><p>Invite explorers, connect Telegram communities and unlock higher reward tiers.</p></div>
                </section>

                <section className={styles.referralCard}>
                  <header>
                    <div>
                      <span>PERSONAL REFERRAL</span>
                      <div className={styles.titleWithHelp}>
                        <h2>Invite explorers</h2>
                        <button type="button" aria-label="Open referral guide" onClick={() => setGuideOpen("referral")}><HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={1.8} /></button>
                      </div>
                    </div>
                    <em><small>ACTIVE TIER</small>{tier}</em>
                  </header>
                  <div className={styles.linkBox}><span>{referralLink ? referralLink.replace("https://", "") : "Invite link unavailable"}</span></div>
                  <div className={styles.networkActions}>
                    <Button tone="secondary" disabled={live.remote && !referralLink} onClick={copyReferral}>{copied ? "Copied" : "Copy link"}</Button>
                    <Button disabled={live.remote && !referralLink} onClick={shareReferral}>Share in Telegram</Button>
                  </div>
                  <small>{live.remote ? `Invite code: ${live.referrals.data?.code ?? "—"} · ${live.referrals.data?.attribution_status ?? "No referral attribution"}${live.referrals.data?.activation ? ` · Level ${live.referrals.data.activation.level} / ${live.referrals.data.activation.required_level} · Minimum account age ${live.referrals.data.activation.required_account_age_hours}h · ${live.referrals.data.activation.eligible ? "Eligible" : "Pending eligibility"}` : ""}` : earn.referralSent ? `${earn.referralShares} share actions recorded · new joins are verified after reaching Level 5.` : "Share your personal link to begin growing your network."}</small>
                </section>

                <section className={styles.tierCard}>
                  <header><div><span>REFERRAL TIERS</span><h2>Tier progression</h2></div></header>
                  <div className={styles.tierList}>
                    {(live.remote ? (live.referrals.data?.tiers ?? []).map(v => ({ name: v.key, target: v.min_verified_referrals, reward: `${v.share_bps / 100}% referral rewards` })) : [
                      { name: "Bronze", target: 0, reward: "5% referral rewards" },
                      { name: "Silver", target: 5, reward: "7% referral rewards" },
                      { name: "Gold", target: 20, reward: "10% referral rewards" },
                    ]).map((item) => {
                      const unlocked = earn.verifiedReferrals >= item.target;
                      const progress = item.target === 0 ? 100 : Math.min(100, Math.round((earn.verifiedReferrals / item.target) * 100));
                      const active = tier === item.name;
                      return (
                        <article key={item.name} className={`${unlocked ? styles.tierUnlocked : ""} ${active ? styles.tierActive : ""}`}>
                          <div><strong>{item.name}</strong><span>{item.reward}</span></div>
                          <em>{active ? "Active" : unlocked ? "Unlocked" : `${earn.verifiedReferrals}/${item.target}`}</em>
                          <i><motion.b animate={{ scaleX: progress / 100 }} initial={false} style={{ transformOrigin: "0 50%" }} transition={mobileMotion.tab} /></i>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className={styles.networkMetrics} aria-label="Referral metrics">
                  <div><span>Invited</span><strong>{earn.referralCount}</strong></div>
                  <div><span>Verified</span><strong>{earn.verifiedReferrals}</strong></div>
                  <div><span>Referral XP</span><strong>{formatNumber(earn.referralXpEarned)}</strong></div>
                </section>

                <section className={styles.referralRoster}>
                  <header className={styles.sectionHeader}><div><span>RECENT INVITES</span><h2>Latest explorers</h2></div><span>Last 5</span></header>
                  <div className={styles.rosterList}>
                    {live.remote && !referralRows.length ? <div className={styles.emptyState}><strong>{live.invitees.isPending ? "Loading explorers…" : live.invitees.isError ? "Invites unavailable." : "No invited explorers yet."}</strong></div> : null}
                    {referralRows.map((person) => {
                      const photo = person.useTelegramPhoto ? telegramUser?.photo_url : undefined;
                      const displayName = person.useTelegramPhoto
                        ? [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ") || person.name
                        : person.name;
                      return (
                        <article key={person.id}>
                          <span className={`${styles.avatar} ${styles[`avatar_${person.tone}`]}`}><AvatarContent owner={`referral:${person.id}`} photoUrl={photo} fallback={initials(displayName)} /></span>
                          <div className={styles.rosterIdentity}><strong>{displayName}</strong><span>Level {person.level} · Invited {person.invitedAt}</span></div>
                          <div className={styles.rosterStatus}><em className={person.status === "Active" ? styles.statusActive : styles.statusPending}>{person.status}</em><small>{person.status === "Active" ? (live.remote ? "Verified" : `+${person.earnedXp ?? 0} XP earned`) : person.activation}</small></div>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section className={styles.groupCard}>
                  <div>
                    <span>GROUP EXPANSION</span>
                    <div className={styles.titleWithHelp}>
                      <h2 className={styles.groupTitle}>Add Dalexio to a group</h2>
                      <button type="button" aria-label="Open group creator guide" onClick={() => setGuideOpen("group")}><HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={1.8} /></button>
                    </div>
                    <p>Connect a Telegram community, make Dalexio an admin and earn from verified member activity.</p>
                  </div>
                  <div className={styles.groupStats}><span>Connected <strong>{earn.connectedGroups}</strong></span><span>Active <strong>{earn.activeGroups}</strong></span><span>Earned <strong>{formatNumber(earn.groupXpEarned)} XP</strong></span></div>
                  <Button disabled={live.remote && (!live.network.data?.can_register || live.isPending("group-register"))} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} />} onClick={addToGroup}>Add bot to a group</Button>
                </section>

                <section className={styles.groupRoster}>
                  <header className={styles.sectionHeader}><div><span>CONNECTED COMMUNITIES</span><h2>Group status</h2></div><span>{live.remote ? earn.connectedGroups : groupRows.length} groups</span></header>
                  <div className={styles.rosterList}>
                    {live.remote && !groupRows.length ? <div className={styles.emptyState}><strong>{live.groups.isPending ? "Loading communities…" : live.groups.isError ? "Communities unavailable." : "No connected communities yet."}</strong></div> : null}
                    {groupRows.map((group) => (
                      <article key={group.id} aria-label={group.name}>
                        <span className={`${styles.avatar} ${styles[`avatar_${group.tone}`]}`}><AvatarContent owner={`group:${group.id}`} fallback={initials(group.name)} /></span>
                        <div className={styles.rosterIdentity}><strong>{group.name}</strong><span>{formatNumber(group.members)} {live.remote ? "qualified speakers" : "members"} · {group.meta}</span>

                        </div>
                        <div className={styles.rosterStatus}><em className={group.admin ? styles.statusActive : styles.statusPending}>{group.admin ? "Bot admin" : "Admin required"}</em><small>{group.earnedXp ? `${formatNumber(group.earnedXp)} XP earned · ${group.status}` : group.status}</small></div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className={styles.networkHistory}>
                  <header className={styles.sectionHeader}><div><span>RECENT ACTIVITY</span><h2>Network History</h2></div></header>
                  {networkHistory.length ? networkHistory.map((entry) => (
                    <article key={entry.id}><i /><div><strong>{entry.title}</strong><span>{entry.description}</span></div>{entry.xp ? <em>+{entry.xp} XP</em> : null}</article>
                  )) : <div className={styles.emptyState}><strong>{live.remote ? "Network history is unavailable." : "No network activity yet."}</strong><span>{live.remote ? "Your confirmed totals appear above." : "Referral and group events will appear here."}</span></div>}
                </section>
              </>
            ) : null}

            {activeTab === "typing" ? (
              <>
                <section className={styles.typingHero}>
                  <span className={styles.typingIcon}><HugeiconsIcon icon={KeyboardIcon} size={25} strokeWidth={1.7} /></span>
                  <div><span>PERMANENT MINI GAME</span><h2>Typing Arena</h2><p>Train speed and accuracy every day. The challenge rules remain the same, with a daily attempt limit.</p></div>
                  <strong>{typingRemaining}/{typingLimit}</strong>
                </section>

                <section className={styles.attemptCard}>
                  <header><div><span>DAILY ATTEMPTS</span><h2>{typingRemaining ? `${typingRemaining} plays remaining` : "Daily limit reached"}</h2></div><em>Resets daily</em></header>
                  <div className={styles.attemptPips}>
                    {Array.from({ length: typingLimit }, (_, index) => <i key={index} className={index < typingUsed ? styles.attemptUsed : ""} />)}
                  </div>
                  <Button size="lg" disabled={typingRemaining === 0 || !canEarn("typing")} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={openTypingArena}>
                    {typingRemaining ? "Enter Typing Arena" : "Come back tomorrow"}
                  </Button>
                </section>

                {live.remote && (live.typing.data?.claimable_balance ?? 0) > 0 ? <Button disabled={live.isPending("typing-claim") || !canEarn("typing")} onClick={() => { void live.claimTyping(); }}>Claim {live.typing.data?.claimable_balance} XP</Button> : null}
                <section className={styles.typingStats}>
                  <div><span>Best WPM</span><strong>{earn.typingBest ? Math.round(earn.typingBest.wpm) : "—"}</strong></div>
                  <div><span>Best accuracy</span><strong>{earn.typingBest ? `${Math.round(earn.typingBest.accuracy)}%` : "—"}</strong></div>
                  <div><span>Runs today</span><strong>{typingUsed}</strong></div>
                </section>

                {typingMission ? <section className={styles.typingMissionCard}>
                  <div><span>ARENA MISSION</span><h2>{typingMission.title}</h2><p>{typingMission.description}</p></div>
                  <button type="button" disabled={typingMission.status === "claimed" || !canEarn("typing") || !canEarn("missions")} onClick={handleTypingMissionAction}>
                    {missionActionLabel(typingMission, live.remote)}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} />
                  </button>
                </section> : null}

                <section className={styles.todayRuns}>
                  <header className={styles.sectionHeader}><div><span>TODAY</span><h2>Typing History</h2></div><span>{typingUsed} runs</span></header>
                  {typingToday.length ? typingToday.map((result, index) => (
                    <article key={`${result.completedAt}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{Math.round(result.wpm)} WPM</strong><small>{Math.round(result.accuracy)}% accuracy · {formatResultTime(result.completedAt)}</small></div>
                      <em>{formatNumber(result.score)}</em>
                    </article>
                  )) : <div className={styles.emptyState}><strong>{live.remote ? "Run history is unavailable." : "No runs today."}</strong><span>{live.remote ? "Your confirmed totals appear above." : "Your first completed game will appear here."}</span></div>}
                </section>
              </>
            ) : null}
          </motion.div>

        <DeferredMount minHeight={90}>
          <section className={styles.sharedStats} aria-label="Earn summary">
            <div><span>Daily streak</span><strong>{earn.streak || 0}d</strong></div>
            <div><span>Lifetime XP</span><strong>{formatNumber(playerProgression.lifetimeXp)}</strong></div>
            <div><span>Referrals</span><strong>{earn.referralCount}</strong></div>
            <div><span>Active groups</span><strong>{earn.activeGroups}</strong></div>
          </section>
        </DeferredMount>
      </main>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} history={earn.history} />
      <NetworkGuideSheet kind={guideOpen} onClose={() => setGuideOpen(null)} />
      <RewardReveal reward={earn.rewardEvent} onClose={earn.dismissReward} />
      <LevelUpReveal event={earn.rewardEvent ? null : earn.levelUpEvent} onClose={earn.dismissLevelUp} />
    </>
  );
}
