import { ArrowRight01Icon, UserGroupIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { Button } from "@/design-system/primitives/Button";
import {
  HistorySheet,
  LevelUpReveal,
  ReferralSheet,
  RewardReveal,
  SignalSheet,
} from "@/features/earn/EarnOverlays";
import {
  getStarterPathProgress,
  isDailyClaimAvailable,
  useEarnStore,
} from "@/game/earn/earnStore";
import type { EarnMission, MissionId } from "@/game/earn/types";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./EarnPage.module.css";

const missionNumber: Record<MissionId, string> = {
  "daily-signal": "01",
  "typing-protocol": "02",
  "invite-explorer": "03",
};

const missionTone: Record<MissionId, "cyan" | "violet" | "gold"> = {
  "daily-signal": "cyan",
  "typing-protocol": "violet",
  "invite-explorer": "gold",
};

function statusLabel(mission: EarnMission): string {
  if (mission.status === "claimed") return "Completed";
  if (mission.status === "completed") return "Reward ready";
  if (mission.status === "in-progress") return "Verifying";
  return "Available";
}

function missionActionLabel(mission: EarnMission): string {
  if (mission.status === "claimed") return "Completed";
  if (mission.status === "completed") return `Claim ${mission.rewardXp} XP`;
  if (mission.id === "typing-protocol") return "Start challenge";
  if (mission.id === "invite-explorer") return mission.status === "in-progress" ? "View invite" : "Invite explorer";
  return "Start mission";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function EarnPage() {
  const navigate = useNavigate();
  const { adapter } = useTelegram();
  const missions = useEarnStore((state) => state.missions);
  const lastClaimDate = useEarnStore((state) => state.lastClaimDate);
  const streak = useEarnStore((state) => state.streak);
  const lifetimeXp = useEarnStore((state) => state.lifetimeXp);
  const level = useEarnStore((state) => state.level);
  const levelXp = useEarnStore((state) => state.levelXp);
  const xpToNextLevel = useEarnStore((state) => state.xpToNextLevel);
  const history = useEarnStore((state) => state.history);
  const rewardEvent = useEarnStore((state) => state.rewardEvent);
  const levelUpEvent = useEarnStore((state) => state.levelUpEvent);
  const referralSent = useEarnStore((state) => state.referralSent);
  const claimDaily = useEarnStore((state) => state.claimDaily);
  const completeDailySignal = useEarnStore((state) => state.completeDailySignal);
  const markReferralSent = useEarnStore((state) => state.markReferralSent);
  const claimMission = useEarnStore((state) => state.claimMission);
  const dismissReward = useEarnStore((state) => state.dismissReward);
  const dismissLevelUp = useEarnStore((state) => state.dismissLevelUp);

  const [signalOpen, setSignalOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const dailyAvailable = isDailyClaimAvailable(lastClaimDate);
  const pathProgress = getStarterPathProgress(missions);
  const claimedMissions = Object.values(missions).filter((mission) => mission.status === "claimed").length;
  const levelProgress = Math.min(100, Math.round((levelXp / xpToNextLevel) * 100));
  const referralCode = adapter.getUser()?.id ?? "explorer";
  const referralLink = `https://t.me/DalexioBot?start=dexoairdrop_${referralCode}`;

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

  const dailyNodes = useMemo(() => {
    const activeIndex = Math.max(0, Math.min(6, streak === 0 ? 0 : (streak - 1) % 7));
    return Array.from({ length: 7 }, (_, index) => ({
      label: String(index + 1).padStart(2, "0"),
      complete: index < activeIndex || (!dailyAvailable && index === activeIndex),
      active: dailyAvailable && index === activeIndex,
    }));
  }, [dailyAvailable, streak]);

  const handleMissionAction = (mission: EarnMission) => {
    adapter.selectionChanged();
    if (mission.status === "completed") {
      claimMission(mission.id);
      return;
    }
    if (mission.status === "claimed") return;
    if (mission.id === "daily-signal") {
      setSignalOpen(true);
      return;
    }
    if (mission.id === "typing-protocol") {
      void navigate({ to: "/earn/typing" });
      return;
    }
    setReferralOpen(true);
  };

  const claimDailyCore = () => {
    if (!dailyAvailable) return;
    adapter.hapticImpact("medium");
    claimDaily();
  };

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />

        <header className={styles.pageHeader}>
          <div>
            <span>MISSION CONTROL</span>
            <h1>Build your signal.</h1>
          </div>
          <button type="button" onClick={() => setHistoryOpen(true)}>
            History
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={1.7} />
          </button>
        </header>

        <section className={styles.progressStrip} aria-label="Earn progression">
          <div><span>Level</span><strong>{level}</strong></div>
          <div><span>Daily streak</span><strong>{streak || 0}d</strong></div>
          <div className={styles.lifetime}><span>Lifetime XP</span><strong>{formatNumber(lifetimeXp)}</strong></div>
        </section>

        <section className={styles.dailyCard} aria-label="Daily claim">
          <div className={styles.dailyGlow} aria-hidden="true" />
          <header>
            <div>
              <span>DAILY CORE</span>
              <h2>{dailyAvailable ? "Your signal is ready." : "Connection secured."}</h2>
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

        <section className={styles.pathCard} aria-label="Starter Protocol progress">
          <header>
            <div><span>SEASON PATHWAY</span><h2>Starter Protocol</h2></div>
            <strong>{claimedMissions}/3</strong>
          </header>
          <div className={styles.pathMeta}><span>Complete all starter missions</span><strong>{pathProgress}%</strong></div>
          <div className={styles.pathTrack}><motion.i animate={{ width: `${pathProgress}%` }} transition={{ duration: .55 }} /></div>
          <div className={styles.levelMeta}><span>Level {level} progress</span><strong>{levelXp} / {xpToNextLevel} XP</strong></div>
          <div className={styles.levelTrack}><motion.i animate={{ width: `${levelProgress}%` }} transition={{ duration: .55 }} /></div>
        </section>

        <section className={styles.missionsSection} aria-label="Starter missions">
          <header className={styles.sectionHeader}>
            <div><span>AVAILABLE NOW</span><h2>Starter Missions</h2></div>
            <span>{Object.values(missions).filter((mission) => mission.status !== "claimed").length} active</span>
          </header>

          <div className={styles.missionList}>
            {Object.values(missions).map((mission, index) => (
              <motion.article
                key={mission.id}
                className={`${styles.missionCard} ${styles[`mission_${missionTone[mission.id]}`]} ${mission.status === "claimed" ? styles.missionClaimed : ""}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .32, delay: index * .055 }}
              >
                <div className={styles.missionHeader}>
                  <span className={styles.missionNumber}>{missionNumber[mission.id]}</span>
                  <div>
                    <span>{mission.category}</span>
                    <h3>{mission.title}</h3>
                  </div>
                  <em>{statusLabel(mission)}</em>
                </div>
                <p>{mission.description}</p>
                <div className={styles.missionReward}>
                  <span>REWARD</span>
                  <strong>+{mission.rewardXp} XP</strong>
                </div>
                <button
                  type="button"
                  className={styles.missionAction}
                  disabled={mission.status === "claimed"}
                  onClick={() => handleMissionAction(mission)}
                >
                  <span>{missionActionLabel(mission)}</span>
                  {mission.status === "claimed" ? <i>✓</i> : <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />}
                </button>
              </motion.article>
            ))}
          </div>
        </section>

        <section className={styles.allocationCard} aria-label="Seasonal allocation preview">
          <span className={styles.allocationIcon}><HugeiconsIcon icon={Wallet01Icon} size={23} strokeWidth={1.7} /></span>
          <div>
            <span>AIRDROP JOURNEY</span>
            <h2>Seasonal Allocation</h2>
            <p>Your final allocation grows with verified activity, accuracy and contribution.</p>
          </div>
          <button type="button" aria-label="Allocation preview"><HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} /></button>
        </section>

        <section className={styles.referralSummary}>
          <span><HugeiconsIcon icon={UserGroupIcon} size={21} strokeWidth={1.7} /></span>
          <div><strong>Community signal</strong><small>{referralSent ? "Invite sent · waiting for verification" : "Invite your first explorer"}</small></div>
          <button type="button" onClick={() => setReferralOpen(true)}><HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} /></button>
        </section>
      </main>

      <SignalSheet open={signalOpen} onClose={() => setSignalOpen(false)} onComplete={completeDailySignal} />
      <ReferralSheet open={referralOpen} onClose={() => setReferralOpen(false)} referralLink={referralLink} sent={referralSent} onSent={markReferralSent} />
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} history={history} />
      <RewardReveal reward={rewardEvent} onClose={dismissReward} />
      <LevelUpReveal event={rewardEvent ? null : levelUpEvent} onClose={dismissLevelUp} />
    </GameShell>
  );
}
