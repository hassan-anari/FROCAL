import {
  ArrowRight01Icon,
  InformationCircleIcon,
  Sword01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { Button } from "@/design-system/primitives/Button";
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
import styles from "./EarnPage.module.css";

type EarnTab = "earn" | "network" | "typing";
const earnTabStorageKey = "dalexio-earn-active-tab";

const tabs = [
  { id: "earn", label: "Earn", icon: Wallet01Icon },
  { id: "network", label: "Network", icon: UserGroupIcon },
  { id: "typing", label: "Typing", icon: Sword01Icon },
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

function missionActionLabel(mission: EarnMission): string {
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

const referralRows = [
  { id: "ref-1", name: "Aria Moon", level: 8, status: "Active", invitedAt: "Jul 25", earnedXp: 84, useTelegramPhoto: true, tone: "cyan" },
  { id: "ref-2", name: "Nova Reed", level: 6, status: "Active", invitedAt: "Jul 24", earnedXp: 56, tone: "violet" },
  { id: "ref-3", name: "Liam Cross", level: 4, status: "Pending", invitedAt: "Jul 23", activation: "Level 4 / 5", tone: "gold" },
  { id: "ref-4", name: "Mika Vale", level: 2, status: "Pending", invitedAt: "Jul 22", activation: "Level 2 / 5", tone: "blue" },
  { id: "ref-5", name: "Sora Lin", level: 1, status: "Pending", invitedAt: "Jul 21", activation: "Level 1 / 5", tone: "pink" },
] as const;

const groupRows = [
  { id: "group-1", name: "Dexo Explorers", members: 2840, admin: true, status: "Active", earnedXp: 1240, meta: "Active 12m ago", tone: "violet" },
  { id: "group-2", name: "Future Builders", members: 1120, admin: true, status: "Review", earnedXp: 0, meta: "Connected Jul 24", tone: "cyan" },
  { id: "group-3", name: "Web3 Creators", members: 7650, admin: false, status: "Needs admin", earnedXp: 0, meta: "Connected Jul 22", tone: "gold" },
] as const;

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function EarnPage() {
  const navigate = useNavigate();
  const { adapter } = useTelegram();
  const earn = useEarnStore();
  const [activeTab, setActiveTab] = useState<EarnTab>(() => {
    const stored = sessionStorage.getItem(earnTabStorageKey);
    return stored === "network" || stored === "typing" ? stored : "earn";
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState<NetworkGuideKind | null>(null);
  const [copied, setCopied] = useState(false);

  const dailyAvailable = isDailyClaimAvailable(earn.lastClaimDate);
  const pathProgress = getStarterPathProgress(earn.missions);
  const claimedMissions = Object.values(earn.missions).filter((mission) => mission.status === "claimed").length;
  const activeMissions = Object.values(earn.missions).filter((mission) => mission.status !== "claimed");
  const completedMissions = Object.values(earn.missions).filter((mission) => mission.status === "claimed");
  const levelProgress = Math.min(100, Math.round((earn.levelXp / earn.xpToNextLevel) * 100));
  const typingToday = getTypingAttemptsToday(earn.typingAttemptDate, earn.typingAttempts);
  const typingRemaining = getTypingAttemptsRemaining(earn.typingAttemptDate, earn.typingAttempts);
  const telegramUser = adapter.getUser();
  const referralCode = telegramUser?.id ?? "explorer";
  const referralLink = `https://t.me/DalexioBot?start=dexoairdrop_${referralCode}`;
  const groupLink = "https://t.me/DalexioBot?startgroup=dexoairdrop";
  const networkHistory = earn.history.filter((entry) => entry.type === "referral" || entry.type === "group").slice(0, 5);
  const tier = referralTier(earn.verifiedReferrals);

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
    sessionStorage.setItem(earnTabStorageKey, activeTab);
  }, [activeTab]);

  const dailyNodes = useMemo(() => {
    const activeIndex = Math.max(0, Math.min(6, earn.streak === 0 ? 0 : (earn.streak - 1) % 7));
    return Array.from({ length: 7 }, (_, index) => ({
      label: String(index + 1).padStart(2, "0"),
      complete: index < activeIndex || (!dailyAvailable && index === activeIndex),
      active: dailyAvailable && index === activeIndex,
    }));
  }, [dailyAvailable, earn.streak]);

  const switchTab = (tab: EarnTab) => {
    if (tab === activeTab) return;
    adapter.selectionChanged();
    setActiveTab(tab);
  };

  const openTypingArena = () => {
    sessionStorage.setItem(earnTabStorageKey, "typing");
    void navigate({ to: "/earn/typing" });
  };

  const handleMissionAction = (mission: EarnMission) => {
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
      void navigate({ to: "/profile" });
      return;
    }
    if (mission.href) {
      if (mission.href.includes("t.me/")) adapter.openTelegramLink(mission.href);
      else adapter.openExternalLink(mission.href);
    }
  };

  const claimDailyCore = () => {
    if (!dailyAvailable) return;
    adapter.hapticImpact("medium");
    earn.claimDaily();
  };

  const handleTypingMissionAction = () => {
    const mission = earn.missions["typing-session"];
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
      earn.markReferralSent();
      adapter.hapticNotice("success");
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      adapter.hapticNotice("error");
    }
  };

  const shareReferral = () => {
    earn.markReferralSent();
    adapter.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me in Dexo Land and grow through the season together.")}`);
  };

  const addToGroup = () => {
    adapter.hapticImpact("light");
    adapter.openTelegramLink(groupLink);
  };

  const renderMission = (mission: EarnMission, index: number, compact = false) => (
    <motion.article
      key={mission.id}
      className={`${styles.missionCard} ${styles[`mission_${missionTone[mission.id]}`]} ${compact ? styles.missionCompact : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .3, delay: index * .045 }}
    >
      <div className={styles.missionHeader}>
        <span className={styles.missionNumber}>{missionNumber[mission.id]}</span>
        <div>
          <span>{mission.category}</span>
          <h3>{mission.title}</h3>
        </div>
        <em>{statusLabel(mission)}</em>
      </div>
      {compact ? null : <p>{mission.description}</p>}
      <div className={styles.missionFooter}>
        <div className={styles.missionReward}><span>REWARD</span><strong>+{mission.rewardXp} XP</strong></div>
        <button
          type="button"
          className={styles.missionAction}
          disabled={mission.status === "claimed"}
          onClick={() => handleMissionAction(mission)}
        >
          <span>{missionActionLabel(mission)}</span>
          {mission.status === "claimed" ? <i>✓</i> : <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} />}
        </button>
      </div>
    </motion.article>
  );

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />

        <header className={styles.pageHeader}>
          <div>
            <span>EARN CENTER</span>
            <h1>Grow your journey.</h1>
            <p>Claim daily rewards, complete missions, expand your network and sharpen your skills.</p>
          </div>
          <button type="button" onClick={() => setHistoryOpen(true)}>
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

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            className={styles.tabContent}
            initial={{ opacity: 0, x: 12, filter: "blur(3px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -9, filter: "blur(2px)" }}
            transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === "earn" ? (
              <>
                <section className={styles.dailyCard} aria-label="Daily claim">
                  <div className={styles.dailyGlow} aria-hidden="true" />
                  <header>
                    <div>
                      <span>DAILY CORE</span>
                      <h2>{dailyAvailable ? "Your reward is ready." : "Daily reward secured."}</h2>
                      <p>{dailyAvailable ? "Claim today’s XP and continue your streak." : "Return tomorrow to extend your daily chain."}</p>
                    </div>
                    <strong>+40 XP</strong>
                  </header>

                  <div className={styles.dailyPath}>
                    {dailyNodes.map((node) => (
                      <span key={node.label} className={`${node.complete ? styles.dayComplete : ""} ${node.active ? styles.dayActive : ""}`}>
                        {node.complete ? "✓" : node.label}
                      </span>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    disabled={!dailyAvailable}
                    trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />}
                    onClick={claimDailyCore}
                  >
                    {dailyAvailable ? "Claim daily core" : "Claimed today"}
                  </Button>
                </section>

                <section className={styles.pathCard} aria-label="Starter Path progress">
                  <header>
                    <div><span>SEASON PATHWAY</span><h2>Starter Protocol</h2></div>
                    <strong>{claimedMissions}/{Object.keys(earn.missions).length}</strong>
                  </header>
                  <div className={styles.pathMeta}><span>Complete all starter missions</span><strong>{pathProgress}%</strong></div>
                  <div className={styles.pathTrack}><motion.i animate={{ width: `${pathProgress}%` }} transition={{ duration: .55 }} /></div>
                  <div className={styles.levelMeta}><span>Level {earn.level} progress</span><strong>{earn.levelXp} / {earn.xpToNextLevel} XP</strong></div>
                  <div className={styles.levelTrack}><motion.i animate={{ width: `${levelProgress}%` }} transition={{ duration: .55 }} /></div>
                </section>

                <section className={styles.missionsSection} aria-label="Active missions">
                  <header className={styles.sectionHeader}>
                    <div><span>AVAILABLE NOW</span><h2>Active Missions</h2></div>
                    <span>{activeMissions.length} active</span>
                  </header>
                  <div className={styles.missionList}>
                    {activeMissions.length ? activeMissions.map((mission, index) => renderMission(mission, index)) : (
                      <div className={styles.emptyState}><strong>All missions cleared.</strong><span>New objectives will appear here.</span></div>
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
                  <div className={styles.linkBox}><span>{referralLink.replace("https://", "")}</span></div>
                  <div className={styles.networkActions}>
                    <Button tone="secondary" onClick={copyReferral}>{copied ? "Copied" : "Copy link"}</Button>
                    <Button onClick={shareReferral}>Share in Telegram</Button>
                  </div>
                  <small>{earn.referralSent ? `${earn.referralShares} share actions recorded · new joins are verified after reaching Level 5.` : "Share your personal link to begin growing your network."}</small>
                </section>

                <section className={styles.tierCard}>
                  <header><div><span>REFERRAL TIERS</span><h2>Tier progression</h2></div></header>
                  <div className={styles.tierList}>
                    {[
                      { name: "Bronze", target: 0, reward: "5% referral rewards" },
                      { name: "Silver", target: 5, reward: "7% referral rewards" },
                      { name: "Gold", target: 20, reward: "10% referral rewards" },
                    ].map((item) => {
                      const unlocked = earn.verifiedReferrals >= item.target;
                      const progress = item.target === 0 ? 100 : Math.min(100, Math.round((earn.verifiedReferrals / item.target) * 100));
                      const active = tier === item.name;
                      return (
                        <article key={item.name} className={`${unlocked ? styles.tierUnlocked : ""} ${active ? styles.tierActive : ""}`}>
                          <div><strong>{item.name}</strong><span>{item.reward}</span></div>
                          <em>{active ? "Active" : unlocked ? "Unlocked" : `${earn.verifiedReferrals}/${item.target}`}</em>
                          <i><motion.b animate={{ width: `${progress}%` }} /></i>
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
                    {referralRows.map((person) => {
                      const photo = person.useTelegramPhoto ? telegramUser?.photo_url : undefined;
                      const displayName = person.useTelegramPhoto
                        ? [telegramUser?.first_name, telegramUser?.last_name].filter(Boolean).join(" ") || person.name
                        : person.name;
                      return (
                        <article key={person.id}>
                          <span className={`${styles.avatar} ${styles[`avatar_${person.tone}`]}`}>{photo ? <img src={photo} alt="" /> : initials(displayName)}</span>
                          <div className={styles.rosterIdentity}><strong>{displayName}</strong><span>Level {person.level} · Invited {person.invitedAt}</span></div>
                          <div className={styles.rosterStatus}><em className={person.status === "Active" ? styles.statusActive : styles.statusPending}>{person.status}</em><small>{person.status === "Active" ? `+${person.earnedXp ?? 0} XP earned` : person.activation}</small></div>
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
                  <Button trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} />} onClick={addToGroup}>Add bot to a group</Button>
                </section>

                <section className={styles.groupRoster}>
                  <header className={styles.sectionHeader}><div><span>CONNECTED COMMUNITIES</span><h2>Group status</h2></div><span>{groupRows.length} groups</span></header>
                  <div className={styles.rosterList}>
                    {groupRows.map((group) => (
                      <article key={group.id}>
                        <span className={`${styles.avatar} ${styles[`avatar_${group.tone}`]}`}>{initials(group.name)}</span>
                        <div className={styles.rosterIdentity}><strong>{group.name}</strong><span>{formatNumber(group.members)} members · {group.meta}</span></div>
                        <div className={styles.rosterStatus}><em className={group.admin ? styles.statusActive : styles.statusPending}>{group.admin ? "Bot admin" : "Admin required"}</em><small>{group.earnedXp ? `${formatNumber(group.earnedXp)} XP earned` : group.status}</small></div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className={styles.networkHistory}>
                  <header className={styles.sectionHeader}><div><span>RECENT ACTIVITY</span><h2>Network History</h2></div></header>
                  {networkHistory.length ? networkHistory.map((entry) => (
                    <article key={entry.id}><i /><div><strong>{entry.title}</strong><span>{entry.description}</span></div>{entry.xp ? <em>+{entry.xp} XP</em> : null}</article>
                  )) : <div className={styles.emptyState}><strong>No network activity yet.</strong><span>Referral and group events will appear here.</span></div>}
                </section>
              </>
            ) : null}

            {activeTab === "typing" ? (
              <>
                <section className={styles.typingHero}>
                  <span className={styles.typingIcon}><HugeiconsIcon icon={Sword01Icon} size={25} strokeWidth={1.7} /></span>
                  <div><span>PERMANENT MINI GAME</span><h2>Typing Arena</h2><p>Train speed and accuracy every day. The challenge rules remain the same, with up to five runs per day.</p></div>
                  <strong>{typingRemaining}/{TYPING_DAILY_LIMIT}</strong>
                </section>

                <section className={styles.attemptCard}>
                  <header><div><span>DAILY ATTEMPTS</span><h2>{typingRemaining ? `${typingRemaining} plays remaining` : "Daily limit reached"}</h2></div><em>Resets daily</em></header>
                  <div className={styles.attemptPips}>
                    {Array.from({ length: TYPING_DAILY_LIMIT }, (_, index) => <i key={index} className={index < typingToday.length ? styles.attemptUsed : ""} />)}
                  </div>
                  <Button size="lg" disabled={typingRemaining === 0} trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={openTypingArena}>
                    {typingRemaining ? "Enter Typing Arena" : "Come back tomorrow"}
                  </Button>
                </section>

                <section className={styles.typingStats}>
                  <div><span>Best WPM</span><strong>{earn.typingBest ? Math.round(earn.typingBest.wpm) : "—"}</strong></div>
                  <div><span>Best accuracy</span><strong>{earn.typingBest ? `${Math.round(earn.typingBest.accuracy)}%` : "—"}</strong></div>
                  <div><span>Runs today</span><strong>{typingToday.length}</strong></div>
                </section>

                <section className={styles.typingMissionCard}>
                  <div><span>ARENA MISSION</span><h2>{earn.missions["typing-session"].title}</h2><p>{earn.missions["typing-session"].description}</p></div>
                  <button type="button" disabled={earn.missions["typing-session"].status === "claimed"} onClick={handleTypingMissionAction}>
                    {missionActionLabel(earn.missions["typing-session"])}
                    <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.8} />
                  </button>
                </section>

                <section className={styles.todayRuns}>
                  <header className={styles.sectionHeader}><div><span>TODAY</span><h2>Typing History</h2></div><span>{typingToday.length} runs</span></header>
                  {typingToday.length ? typingToday.map((result, index) => (
                    <article key={`${result.completedAt}-${index}`}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div><strong>{Math.round(result.wpm)} WPM</strong><small>{Math.round(result.accuracy)}% accuracy · {formatResultTime(result.completedAt)}</small></div>
                      <em>{formatNumber(result.score)}</em>
                    </article>
                  )) : <div className={styles.emptyState}><strong>No runs today.</strong><span>Your first completed game will appear here.</span></div>}
                </section>
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <section className={styles.sharedStats} aria-label="Earn summary">
          <div><span>Daily streak</span><strong>{earn.streak || 0}d</strong></div>
          <div><span>Lifetime XP</span><strong>{formatNumber(earn.lifetimeXp)}</strong></div>
          <div><span>Referrals</span><strong>{earn.referralCount}</strong></div>
          <div><span>Active groups</span><strong>{earn.activeGroups}</strong></div>
        </section>
      </main>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} history={earn.history} />
      <NetworkGuideSheet kind={guideOpen} onClose={() => setGuideOpen(null)} />
      <RewardReveal reward={earn.rewardEvent} onClose={earn.dismissReward} />
      <LevelUpReveal event={earn.rewardEvent ? null : earn.levelUpEvent} onClose={earn.dismissLevelUp} />
    </GameShell>
  );
}
