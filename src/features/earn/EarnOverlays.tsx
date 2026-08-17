import { ArrowRight01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { AssetKey } from "@/assets/registry";
import { DexoStage } from "@/design-system/components/DexoStage";
import { Button } from "@/design-system/primitives/Button";
import type { EarnHistoryEntry, LevelUpEvent, RewardEvent } from "@/game/earn/types";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { usePauseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import styles from "./EarnOverlays.module.css";

interface OverlayShellProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: ReactNode;
  placement?: "sheet" | "center";
}

function OverlayShell({ open, onClose, ariaLabel, children, placement = "sheet" }: OverlayShellProps) {
  usePauseBackgroundMotion(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={mobileMotion.micro}
          role="presentation"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className={`${styles.surface} ${styles[placement]}`}
            initial={placement === "sheet" ? { opacity: 0, y: 18 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={placement === "sheet" ? { opacity: 0, y: 12 } : { opacity: 0, y: 7 }}
            transition={mobileMotion.overlay}
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
    <OverlayShell open={open} onClose={onClose} ariaLabel="Earn history">
      <header className={styles.sheetHeader}>
        <span>ACTIVITY ARCHIVE</span>
        <h2>Your recent progress.</h2>
        <p>Daily claims, missions, network growth and Typing Arena results are stored here.</p>
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


export type NetworkGuideKind = "referral" | "group";

interface NetworkGuideSheetProps {
  kind: NetworkGuideKind | null;
  onClose: () => void;
}

const guideContent = {
  referral: {
    eyebrow: "REFERRAL GUIDE",
    title: "Invite people. Grow together.",
    description: "Your personal link connects every successful explorer to your network.",
    steps: [
      ["Share your personal link", "Send it directly or share it inside Telegram."],
      ["Reach Level 5", "An invitation becomes successful after the new explorer reaches Level 5."],
      ["Unlock shared rewards", "After verification, part of their eligible Earn activity is credited to you."],
      ["Raise your tier", "More successful invitations increase your referral percentage."],
    ],
    note: "Only verified activity is counted. Duplicate, inactive, or suspicious accounts do not generate rewards.",
  },
  group: {
    eyebrow: "CREATOR PROGRAM",
    title: "Turn a community into a network.",
    description: "This program is built for creators, community owners, and large Telegram groups or channels.",
    steps: [
      ["Connect the group", "Use the group button and choose the community you manage."],
      ["Make Dalexio an admin", "Admin access is required so valid community activity can be verified."],
      ["Register the creator", "Rewards belong only to the creator account that connected the group."],
      ["Keep the community active", "Verified conversations and active members determine ongoing creator rewards."],
    ],
    note: "Other group administrators do not automatically share the creator reward. Ownership changes require a new verification.",
  },
} as const;

export function NetworkGuideSheet({ kind, onClose }: NetworkGuideSheetProps) {
  const content = kind ? guideContent[kind] : null;
  return (
    <OverlayShell open={content !== null} onClose={onClose} ariaLabel={kind === "group" ? "Group creator guide" : "Referral guide"}>
      {content ? (
        <div className={styles.guideSheet}>
          <header className={styles.sheetHeader}>
            <span>{content.eyebrow}</span>
            <h2>{content.title}</h2>
            <p>{content.description}</p>
          </header>
          <div className={styles.guideSteps}>
            {content.steps.map(([title, description], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{title}</strong><p>{description}</p></div>
              </article>
            ))}
          </div>
          <aside>{content.note}</aside>
          <Button size="lg" onClick={onClose}>Got it</Button>
        </div>
      ) : null}
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
          <Button size="lg" trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.8} />} onClick={onClose}>Return to Earn</Button>
        </div>
      ) : null}
    </OverlayShell>
  );
}
