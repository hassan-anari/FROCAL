import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AssetKey } from "@/assets/registry";
import { AssetImage } from "@/design-system/components/AssetImage";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { Button } from "@/design-system/primitives/Button";
import {
  achievementById,
  frameById,
  medalById,
  profileTitles,
  titleById,
  visibleProfileFrames,
} from "@/game/profile/profileCatalog";
import type { AchievementId, AchievementProgress, FrameId, MedalId, TitleId } from "@/game/profile/types";
import { ProfileAvatar } from "./ProfileAvatar";
import styles from "./ProfileOverlays.module.css";

export interface ProfileDetailItem {
  kind: "achievement" | "medal" | "frame";
  name: string;
  description: string;
  asset: AssetKey;
  unlocked: boolean;
  label: string;
  unlockHint?: string;
  rewardXp?: number;
  unlockedAt?: string;
  progress?: AchievementProgress;
  primaryLabel?: string;
  onPrimary?: () => void;
}

interface OverlayFrameProps {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function OverlayFrame({ eyebrow, title, onClose, children, footer }: OverlayFrameProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const scrollRoot = document.querySelector<HTMLElement>("[data-game-scroll]");
    const appRoot = document.getElementById("root");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollTop = scrollRoot?.scrollTop ?? 0;
    const previousOverflow = scrollRoot?.style.overflow ?? "";
    const previousTouchAction = scrollRoot?.style.touchAction ?? "";
    const previousOverscroll = scrollRoot?.style.overscrollBehavior ?? "";
    const rootWasInert = appRoot?.hasAttribute("inert") ?? false;
    const rootAriaHidden = appRoot ? appRoot.getAttribute("aria-hidden") : null;

    document.documentElement.classList.add("profile-modal-open");
    if (scrollRoot) {
      scrollRoot.style.overflow = "hidden";
      scrollRoot.style.touchAction = "none";
      scrollRoot.style.overscrollBehavior = "none";
    }
    if (appRoot) {
      appRoot.setAttribute("inert", "");
      appRoot.setAttribute("aria-hidden", "true");
    }

    const focusTimer = window.setTimeout(() => {
      const preferred = sheetRef.current?.querySelector<HTMLElement>("[data-modal-primary], [data-modal-close]");
      preferred?.focus({ preventScroll: true });
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        sheetRef.current.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.documentElement.classList.remove("profile-modal-open");
      if (scrollRoot) {
        scrollRoot.style.overflow = previousOverflow;
        scrollRoot.style.touchAction = previousTouchAction;
        scrollRoot.style.overscrollBehavior = previousOverscroll;
        scrollRoot.scrollTop = scrollTop;
      }
      if (appRoot) {
        if (!rootWasInert) appRoot.removeAttribute("inert");
        if (rootAriaHidden === null) appRoot.removeAttribute("aria-hidden");
        else appRoot.setAttribute("aria-hidden", rootAriaHidden);
      }
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  const modal = (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={mobileMotion.micro}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <motion.section
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, y: 18, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.998 }}
        transition={mobileMotion.overlay}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles.sheetHeader}>
          <div><span>{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
          <button type="button" data-modal-close onClick={() => closeRef.current()} aria-label="Close">×</button>
        </header>
        <div className={styles.sheetBody}>{children}</div>
        <footer className={styles.sheetFooter}>
          {footer ?? (
            <Button type="button" tone="primary" size="md" className={styles.primaryButton} data-modal-primary onClick={() => closeRef.current()}>
              Got it
            </Button>
          )}
        </footer>
      </motion.section>
    </motion.div>
  );

  return createPortal(modal, document.body);
}

interface DetailSheetProps {
  item: ProfileDetailItem;
  onClose: () => void;
}

export function ProfileDetailSheet({ item, onClose }: DetailSheetProps) {
  const progress = item.progress;
  const ratio = progress ? Math.min(1, progress.current / Math.max(1, progress.target)) : 0;
  const action = item.primaryLabel && item.onPrimary ? (
    <Button
      type="button"
      tone="primary"
      size="md"
      className={styles.primaryButton}
      data-modal-primary
      trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} />}
      onClick={() => {
        item.onPrimary?.();
        onClose();
      }}
    >
      {item.primaryLabel}
    </Button>
  ) : undefined;

  return (
    <OverlayFrame eyebrow={item.kind} title={item.name} onClose={onClose} footer={action}>
      <div className={`${styles.detailArt} ${item.unlocked ? "" : styles.detailLocked}`}>
        <AssetImage assetKey={item.asset} loading="eager" draggable={false} />
        {item.unlocked ? null : <span>LOCKED</span>}
      </div>
      <div className={styles.detailCopy}>
        <span className={item.unlocked ? styles.unlockedLabel : styles.lockedLabel}>{item.label}</span>
        <p>{item.description}</p>
      </div>
      {progress ? (
        <div className={styles.detailProgress}>
          <div><span>{item.name === "First Verified Activity" ? "Verified messages" : "Progress"}</span><strong>{progress.current} / {progress.target}</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
          {progress.secondaryTarget ? (
            <div className={styles.secondaryProgress}>
              <span>{progress.secondaryLabel}</span>
              <strong>{progress.secondaryCurrent ?? 0} / {progress.secondaryTarget}</strong>
            </div>
          ) : null}
        </div>
      ) : null}
      <dl className={styles.detailMeta}>
        {item.rewardXp ? <div><dt>Reward</dt><dd>+{item.rewardXp} XP</dd></div> : null}
        {item.unlockedAt ? <div><dt>Unlocked</dt><dd>{item.unlockedAt}</dd></div> : null}
        {!item.unlocked && item.unlockHint ? <div><dt>How to unlock</dt><dd>{item.unlockHint}</dd></div> : null}
      </dl>
    </OverlayFrame>
  );
}

interface CustomizeSheetProps {
  firstName: string;
  photoUrl?: string | null;
  frameId: FrameId;
  titleId: TitleId;
  medalId: MedalId | null;
  achievementId: AchievementId | null;
  unlockedFrameIds: FrameId[];
  unlockedTitleIds: TitleId[];
  unlockedMedalIds: MedalId[];
  unlockedAchievementIds: AchievementId[];
  onClose: () => void;
  onSave: (input: { frameId: FrameId; titleId: TitleId; medalId: MedalId | null; achievementId: AchievementId | null }) => void;
}

export function CustomizeProfileSheet({
  firstName,
  photoUrl,
  frameId,
  titleId,
  medalId,
  achievementId,
  unlockedFrameIds,
  unlockedTitleIds,
  unlockedMedalIds,
  unlockedAchievementIds,
  onClose,
  onSave,
}: CustomizeSheetProps) {
  const [draftFrame, setDraftFrame] = useState(frameId);
  const [draftTitle, setDraftTitle] = useState(titleId);
  const [draftMedal, setDraftMedal] = useState<MedalId | null>(medalId);
  const [draftAchievement, setDraftAchievement] = useState<AchievementId | null>(achievementId);

  const medalOptions = useMemo(() => unlockedMedalIds.map((id) => medalById[id]), [unlockedMedalIds]);
  const achievementOptions = useMemo(() => unlockedAchievementIds.map((id) => achievementById[id]), [unlockedAchievementIds]);

  return (
    <OverlayFrame eyebrow="Profile cosmetic" title="Customize profile" onClose={onClose} footer={
      <Button
        type="button"
        tone="primary"
        size="md"
        className={styles.primaryButton}
        data-modal-primary
        trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} />}
        onClick={() => {
          onSave({ frameId: draftFrame, titleId: draftTitle, medalId: draftMedal, achievementId: draftAchievement });
          onClose();
        }}
      >
        Save profile
      </Button>
    }>
      <section className={styles.livePreview}>
        <ProfileAvatar firstName={firstName} photoUrl={photoUrl} frameId={draftFrame} size="lg" />
        <div>
          <span>LIVE PREVIEW</span>
          <h3>{firstName}</h3>
          <div className={styles.titlePlate}>
            <AssetImage assetKey="profile.cosmetic.titlePlate" draggable={false} />
            <strong>{titleById[draftTitle].name}</strong>
          </div>
        </div>
      </section>

      <section className={styles.customizeSection}>
        <header><span>Avatar frame</span><strong>{frameById[draftFrame].name}</strong></header>
        <div className={styles.optionRail}>
          {visibleProfileFrames.map((frame) => {
            const unlocked = unlockedFrameIds.includes(frame.id);
            return (
              <button
                key={frame.id}
                type="button"
                disabled={!unlocked}
                className={`${styles.frameOption} ${draftFrame === frame.id ? styles.optionActive : ""}`}
                onClick={() => setDraftFrame(frame.id)}
                aria-label={`${frame.name}${unlocked ? "" : " locked"}`}
              >
                <AssetImage assetKey={frame.asset} loading="lazy" draggable={false} />
                <span>{frame.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.customizeSection}>
        <header><span>Profile title</span><strong>{titleById[draftTitle].name}</strong></header>
        <div className={styles.textOptions}>
          {profileTitles.map((title) => {
            const unlocked = unlockedTitleIds.includes(title.id);
            return (
              <button
                key={title.id}
                type="button"
                disabled={!unlocked}
                className={draftTitle === title.id ? styles.textOptionActive : ""}
                onClick={() => setDraftTitle(title.id)}
              >
                <span>{title.name}</span>
                <small>{unlocked ? "Available" : "Locked"}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.customizeSection}>
        <header><span>Featured medal</span><strong>{draftMedal ? medalById[draftMedal].name : "None"}</strong></header>
        <div className={styles.featureOptions}>
          <button type="button" className={draftMedal === null ? styles.featureActive : ""} onClick={() => setDraftMedal(null)}>None</button>
          {medalOptions.map((medal) => (
            <button key={medal.id} type="button" className={draftMedal === medal.id ? styles.featureActive : ""} onClick={() => setDraftMedal(medal.id)}>
              <AssetImage assetKey={medal.asset} loading="lazy" draggable={false} />
              <span>{medal.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={styles.customizeSection}>
        <header><span>Featured achievement</span><strong>{draftAchievement ? achievementById[draftAchievement].name : "None"}</strong></header>
        <div className={styles.featureOptions}>
          <button type="button" className={draftAchievement === null ? styles.featureActive : ""} onClick={() => setDraftAchievement(null)}>None</button>
          {achievementOptions.map((achievement) => (
            <button key={achievement.id} type="button" className={draftAchievement === achievement.id ? styles.featureActive : ""} onClick={() => setDraftAchievement(achievement.id)}>
              <AssetImage assetKey={achievement.asset} loading="lazy" draggable={false} />
              <span>{achievement.name}</span>
            </button>
          ))}
        </div>
      </section>
    </OverlayFrame>
  );
}

interface ShareProfileSheetProps {
  firstName: string;
  username?: string | null;
  photoUrl?: string | null;
  frameId: FrameId;
  titleId: TitleId;
  level: number;
  lifetimeXp: number;
  medalId: MedalId | null;
  achievementId: AchievementId | null;
  onClose: () => void;
  onShare: () => void;
  onCopy: () => Promise<void>;
}

export function ShareProfileSheet({
  firstName,
  username,
  photoUrl,
  frameId,
  titleId,
  level,
  lifetimeXp,
  medalId,
  achievementId,
  onClose,
  onShare,
  onCopy,
}: ShareProfileSheetProps) {
  const [copied, setCopied] = useState(false);
  const medal = medalId ? medalById[medalId] : null;
  const achievement = achievementId ? achievementById[achievementId] : null;

  const copy = async () => {
    await onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <OverlayFrame eyebrow="Telegram share" title="Share profile" onClose={onClose} footer={
      <div className={styles.shareActions}>
        <Button type="button" tone="secondary" size="md" className={styles.secondaryButton} onClick={() => void copy()}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        <Button type="button" tone="primary" size="md" className={styles.primaryButton} data-modal-primary onClick={onShare}>
          Share in Telegram
        </Button>
      </div>
    }>
      <div className={styles.shareCard}>
        <div className={styles.shareHero}>
          <ProfileAvatar firstName={firstName} photoUrl={photoUrl} frameId={frameId} size="lg" className={styles.shareAvatar} />
          <div className={styles.shareIdentity}>
            <span>DEXO LAND PROFILE</span>
            <strong>{firstName}</strong>
            <small>{username ? `@${username}` : "Telegram explorer"}</small>
            <div className={styles.shareTitle}>{titleById[titleId].name}</div>
          </div>
        </div>
        <div className={styles.shareStats}>
          <div><strong>{level}</strong><span>Level</span></div>
          <div><strong>{lifetimeXp.toLocaleString()}</strong><span>Lifetime XP</span></div>
          <div><strong>S1</strong><span>Season</span></div>
        </div>
        <div className={styles.shareHonors}>
          <div>
            {medal ? <AssetImage assetKey={medal.asset} loading="eager" draggable={false} /> : <span>—</span>}
            <p>{medal?.name ?? "No featured medal"}</p>
          </div>
          <div>
            {achievement ? <AssetImage assetKey={achievement.asset} loading="eager" draggable={false} /> : <span>—</span>}
            <p>{achievement?.name ?? "No featured achievement"}</p>
          </div>
        </div>
      </div>
      <p className={styles.shareHint}>This preview represents the profile details included with your Telegram share link.</p>
    </OverlayFrame>
  );
}
