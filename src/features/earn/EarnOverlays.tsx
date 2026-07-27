import { ArrowRight01Icon, UserGroupIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AssetKey } from "@/assets/registry";
import { DexoStage } from "@/design-system/components/DexoStage";
import { Button } from "@/design-system/primitives/Button";
import type { EarnHistoryEntry, LevelUpEvent, RewardEvent } from "@/game/earn/types";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./EarnOverlays.module.css";

interface OverlayShellProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  placement?: "center" | "sheet";
  ariaLabel: string;
}

function OverlayShell({ open, onClose, children, placement = "sheet", ariaLabel }: OverlayShellProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", escape);
    };
  }, [onClose, open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: .22 }}
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className={`${styles.surface} ${styles[placement]}`}
            initial={placement === "sheet" ? { opacity: 0, y: 38 } : { opacity: 0, scale: .92, y: 12 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={placement === "sheet" ? { opacity: 0, y: 28 } : { opacity: 0, scale: .96, y: 8 }}
            transition={{ duration: .34, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
          >
            {placement === "sheet" ? <span className={styles.handle} aria-hidden="true" /> : null}
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

interface SignalSheetProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function SignalSheet({ open, onClose, onComplete }: SignalSheetProps) {
  const { adapter } = useTelegram();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setSyncing(false);
      setProgress(0);
    }
  }, [open]);

  useEffect(() => {
    if (!syncing) return;
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(100, current + 8));
    }, 90);
    return () => window.clearInterval(timer);
  }, [syncing]);

  useEffect(() => {
    if (!syncing || progress < 100) return;
    adapter.hapticNotice("success");
    const timer = window.setTimeout(() => {
      onComplete();
      onClose();
    }, 360);
    return () => window.clearTimeout(timer);
  }, [adapter, onClose, onComplete, progress, syncing]);

  return (
    <OverlayShell open={open} onClose={syncing ? () => undefined : onClose} ariaLabel="Daily Signal mission">
      <header className={styles.sheetHeader}>
        <span>DAILY SIGNAL</span>
        <h2>Stabilize your core.</h2>
        <p>Align the three connection nodes and lock today’s signal.</p>
      </header>

      <div className={styles.signalCore} aria-hidden="true">
        <motion.i animate={syncing ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 3, repeat: syncing ? Number.POSITIVE_INFINITY : 0, ease: "linear" }} />
        <motion.i animate={syncing ? { rotate: -360 } : { rotate: 0 }} transition={{ duration: 4.4, repeat: syncing ? Number.POSITIVE_INFINITY : 0, ease: "linear" }} />
        <strong>{progress}%</strong>
      </div>

      <div className={styles.nodeList}>
        {["Identity channel", "Mission relay", "Season core"].map((label, index) => {
          const threshold = (index + 1) * 30;
          const ready = progress >= threshold;
          return (
            <div key={label} className={ready ? styles.nodeReady : ""}>
              <span>0{index + 1}</span>
              <strong>{label}</strong>
              <em>{ready ? "Aligned" : syncing ? "Syncing" : "Ready"}</em>
            </div>
          );
        })}
      </div>

      <Button
        size="lg"
        disabled={syncing}
        trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />}
        onClick={() => {
          adapter.hapticImpact("medium");
          setSyncing(true);
          setProgress(8);
        }}
      >
        {syncing ? "Synchronizing" : "Stabilize signal"}
      </Button>
    </OverlayShell>
  );
}

interface ReferralSheetProps {
  open: boolean;
  onClose: () => void;
  referralLink: string;
  sent: boolean;
  onSent: () => void;
}

export function ReferralSheet({ open, onClose, referralLink, sent, onSent }: ReferralSheetProps) {
  const { adapter } = useTelegram();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const field = document.createElement("textarea");
        field.value = referralLink;
        field.style.position = "fixed";
        field.style.opacity = "0";
        document.body.appendChild(field);
        field.select();
        document.execCommand("copy");
        field.remove();
      }
      setCopied(true);
      onSent();
      adapter.hapticNotice("success");
    } catch {
      adapter.hapticNotice("error");
    }
  };

  const shareLink = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Join me in Dexo Land and begin your seasonal journey.")}`;
    onSent();
    adapter.openTelegramLink(shareUrl);
  };

  return (
    <OverlayShell open={open} onClose={onClose} ariaLabel="Invite an Explorer">
      <header className={styles.sheetHeader}>
        <span>COMMUNITY MISSION</span>
        <h2>Invite an Explorer.</h2>
        <p>Your reward unlocks after one new explorer is verified.</p>
      </header>

      <div className={styles.referralHero}>
        <span className={styles.referralIcon}><HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.7} /></span>
        <div><span>YOUR INVITE LINK</span><strong>{referralLink.replace("https://", "")}</strong></div>
      </div>

      <div className={styles.referralStatus}>
        <i className={sent ? styles.statusPending : styles.statusReady} />
        <div>
          <strong>{sent ? "Invite sent · verification pending" : "Ready to invite"}</strong>
          <span>{sent ? "The mission completes when the referral is validated." : "Share or copy your personal Dexo Land link."}</span>
        </div>
      </div>

      <div className={styles.twoButtons}>
        <Button tone="secondary" onClick={copyLink}>{copied ? "Copied" : "Copy link"}</Button>
        <Button onClick={shareLink}>Share in Telegram</Button>
      </div>
    </OverlayShell>
  );
}

interface HistorySheetProps {
  open: boolean;
  onClose: () => void;
  history: EarnHistoryEntry[];
}

function formatTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function HistorySheet({ open, onClose, history }: HistorySheetProps) {
  return (
    <OverlayShell open={open} onClose={onClose} ariaLabel="Mission history">
      <header className={styles.sheetHeader}>
        <span>MISSION ARCHIVE</span>
        <h2>Your recent progress.</h2>
        <p>Claims, challenge results and progression events are stored here.</p>
      </header>
      <div className={styles.historyList}>
        {history.map((item) => (
          <article key={item.id}>
            <i className={styles[`history_${item.type}`]} />
            <div>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <small>{formatTime(item.createdAt)}</small>
            </div>
            {item.xp ? <em>+{item.xp} XP</em> : null}
          </article>
        ))}
      </div>
    </OverlayShell>
  );
}

interface RewardRevealProps {
  reward: RewardEvent | null;
  onClose: () => void;
}

export function RewardReveal({ reward, onClose }: RewardRevealProps) {
  const { adapter } = useTelegram();
  useEffect(() => {
    if (reward) adapter.hapticNotice("success");
  }, [adapter, reward]);

  return (
    <OverlayShell open={reward !== null} onClose={() => undefined} placement="center" ariaLabel="XP reward">
      {reward ? (
        <div className={styles.rewardReveal}>
          <div className={styles.rewardRings} aria-hidden="true"><i /><i /><i /></div>
          <span className={styles.rewardGlyph}><HugeiconsIcon icon={Wallet01Icon} size={29} strokeWidth={1.6} /></span>
          <span>REWARD ACQUIRED</span>
          <h2>+{reward.xp} XP</h2>
          <p>{reward.title} is complete. Your Dexo progression has been updated.</p>
          <Button size="lg" trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={onClose}>Continue</Button>
        </div>
      ) : null}
    </OverlayShell>
  );
}

function levelAsset(level: number): AssetKey {
  if (level >= 30) return "dexo.level30";
  if (level >= 20) return "dexo.level20";
  if (level >= 15) return "dexo.level15";
  if (level >= 10) return "dexo.level10";
  if (level >= 5) return "dexo.level05";
  return "dexo.personalityVictory";
}

interface LevelUpRevealProps {
  event: LevelUpEvent | null;
  onClose: () => void;
}

export function LevelUpReveal({ event, onClose }: LevelUpRevealProps) {
  const title = useMemo(() => event?.evolution ? `${event.evolutionTitle} Evolution` : `Level ${event?.newLevel ?? ""}`, [event]);
  return (
    <OverlayShell open={event !== null} onClose={() => undefined} placement="center" ariaLabel="Dexo level up">
      {event ? (
        <div className={styles.levelReveal}>
          <span>{event.evolution ? "DEXO EVOLUTION" : "LEVEL UP"}</span>
          <h2>{title}</h2>
          <DexoStage character={levelAsset(event.newLevel)} characterScale={event.evolution ? 1.02 : .96} effect="reveal" showParticles className={styles.levelDexo} />
          <p>{event.evolution ? `Dexo has entered the ${event.evolutionTitle} stage.` : `Your companion advanced from Level ${event.previousLevel} to Level ${event.newLevel}.`}</p>
          <Button size="lg" trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={onClose}>Return to missions</Button>
        </div>
      ) : null}
    </OverlayShell>
  );
}
