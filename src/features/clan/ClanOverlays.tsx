import { clanRankLabel } from "@/integrations/api/clanActivity";
import {
  InformationCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion } from "motion/react";
import { AssetImage } from "@/design-system/components/AssetImage";
import { AvatarContent } from "@/design-system/components/AvatarContent";
import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { usePauseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import { Button } from "@/design-system/primitives/Button";
import { ClanQueryState } from "./ClanQueryState";
import type { ClanAchievement, ClanInventoryItem, ClanJoinApplicant, ClanRole, ClanSummary } from "@/game/clan/types";
import { clanRoleArt, getClanEmblemAssetKey, getClanHqStateAssetKey, getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import styles from "./ClanOverlays.module.css";

interface ClanModalProps {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  sensitive?: boolean;
}

const focusableSelector = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function ClanModal({ eyebrow, title, onClose, children, footer, sensitive }: ClanModalProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  usePauseBackgroundMotion(true);

  useEffect(() => {
    const scrollRoot = document.querySelector<HTMLElement>("[data-game-scroll]");
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollTop = scrollRoot?.scrollTop ?? 0;
    const previousOverflow = scrollRoot?.style.overflow ?? "";
    const previousTouchAction = scrollRoot?.style.touchAction ?? "";
    const previousOverscroll = scrollRoot?.style.overscrollBehavior ?? "";
    const lockTimer = window.setTimeout(() => {
      if (!scrollRoot) return;
      scrollRoot.style.overflow = "hidden";
      scrollRoot.style.touchAction = "none";
      scrollRoot.style.overscrollBehavior = "none";
    }, 180);
    const timer = window.setTimeout(() => {
      sheetRef.current?.querySelector<HTMLElement>("[data-clan-primary], [data-clan-close]")?.focus({ preventScroll: true });
    }, 260);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute("disabled"));
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

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(lockTimer);
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      if (scrollRoot) {
        scrollRoot.style.overflow = previousOverflow;
        scrollRoot.style.touchAction = previousTouchAction;
        scrollRoot.style.overscrollBehavior = previousOverscroll;
        scrollRoot.scrollTop = scrollTop;
      }
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
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
        data-ph-sensitive={sensitive ? "" : undefined}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={mobileMotion.overlay}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div><span>{eyebrow}</span><h2 id={titleId}>{title}</h2></div>
          <button type="button" data-clan-close aria-label="Close" onClick={() => closeRef.current()}>×</button>
        </header>
        <div className={styles.body}>{children}</div>
        <footer className={styles.footer}>
          {footer ?? (
            <Button type="button" tone="primary" size="sm" className={styles.primary} data-clan-primary onClick={() => closeRef.current()}>
              Got it
            </Button>
          )}
        </footer>
      </motion.section>
    </motion.div>,
    document.body,
  );
}

export function RoleConfirmSheet({
  role,
  onClose,
  onConfirm,
  pending = false,
}: {
  role: ClanRole;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const captain = role === "captain";
  return (
    <ClanModal
      eyebrow="Permanent path"
      title={captain ? "Become a Captain" : "Become a Soldier"}
      onClose={onClose}
      footer={
        <div className={styles.doubleActions}>
          <Button type="button" tone="secondary" size="sm" onClick={onClose}>Go back</Button>
          <Button type="button" tone="primary" size="sm" className={styles.primary} data-clan-primary disabled={pending} onClick={onConfirm}>
            Confirm path
          </Button>
        </div>
      }
    >
      <div className={`${styles.roleArtStage} ${captain ? styles.captain : styles.soldier}`}>
        <AssetImage assetKey={clanRoleArt[role]} className={styles.roleArt} />
      </div>
      <div className={styles.centerCopy}>
        <strong>This choice is made once.</strong>
        <p>
          {captain
            ? "You will lead the clan, approve members and decide how Treasury is used. The clan's direction and success will depend heavily on your decisions."
            : "You will shape clan progress through your own actions. Missions, contribution and consistency can change what your clan is able to achieve."}
        </p>
      </div>
      <div className={styles.note}>
        <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.55} />
        <span>No role-switch control will be available after confirmation.</span>
      </div>
    </ClanModal>
  );
}

export function ClanPreviewSheet({
  clan,
  pendingClanId,
  onClose,
  onJoin,
  pending = false,
}: {
  clan: ClanSummary;
  pendingClanId: string | null;
  onClose: () => void;
  onJoin: () => void;
  pending?: boolean;
}) {
  const full = clan.members >= clan.capacity || clan.status === "Full";
  const hasPending = pendingClanId !== null;
  const isThisPending = pendingClanId === clan.id;

  let label = "Request to join";
  if (full) label = "Clan full";
  else if (isThisPending) label = "Request pending";
  else if (hasPending) label = "One request already active";

  return (
    <ClanModal
      eyebrow="Clan preview"
      title={clan.name}
      onClose={onClose}
      footer={
        <Button
          type="button"
          tone={full || hasPending ? "secondary" : "primary"}
          size="sm"
          className={styles.primary}
          data-clan-primary
          disabled={full || hasPending || pending}
          onClick={onJoin}
        >
          {label}
        </Button>
      }
    >
      <div className={`${styles.clanHero} ${styles[clan.accent]}`}>
        <AssetImage assetKey={getClanHqStateAssetKey(clan.hqState ?? "normal", clan.level)} className={styles.clanHeroHq} />
        <div className={styles.clanHeroShade} />
        <div className={styles.clanHeroIdentity}>
          <div className={styles.clanMark} style={{ "--identity-hue": getIdentityHue(clan.name) } as CSSProperties}>
            <span className={styles.clanMarkIdentity}>
              {clan.imageUrl ? <img src={clan.imageUrl} alt="" /> : <b>{getIdentityInitials(clan.name)}</b>}
            </span>
            <AssetImage assetKey={getClanEmblemAssetKey()} className={styles.clanMarkFrame} />
          </div>
          <div>
            <span>{clanRankLabel(clan.rank, clan.rankStatus)} SEASON</span>
            <h3>{clan.name}</h3>
            <p>{clan.summary}</p>
          </div>
        </div>
      </div>
      <div className={styles.stats}>
        <div><span>Level</span><strong>{clan.level}</strong></div>
        <div><span>Members</span><strong>{clan.members}/{clan.capacity}</strong></div>
        <div><span>Score</span><strong>{clan.score.toLocaleString()}</strong></div>
      </div>
      <div className={styles.detailList}>
        <div><span>Status</span><strong>{clan.status}</strong></div>
        <div><span>Match</span><strong>{clan.match === undefined ? "—" : `${clan.match}%`}</strong></div>
        <div><span>Request rule</span><strong>One active request</strong></div>
      </div>
    </ClanModal>
  );
}

export function ClanItemSheet({
  item,
  quantity,
  captain,
  treasury,
  source,
  activeUntil,
  onClose,
  onPurchase,
  onActivate,
  purchaseAllowed, activationAllowed, pending = false, blockedLabel,
}: {
  item: ClanInventoryItem;
  quantity: number;
  captain: boolean;
  treasury: number;
  source: "inventory" | "shop";
  activeUntil: number | null;
  onClose: () => void;
  onPurchase: () => void;
  onActivate: () => void;
  purchaseAllowed?: boolean;
  activationAllowed?: boolean;
  pending?: boolean;
  blockedLabel?: string;
}) {
  const canBuy = captain && (purchaseAllowed ?? treasury >= item.price) && !pending;
  const active = activeUntil !== null && activeUntil > Date.now();
  const canActivate = captain && source === "inventory" && (activationAllowed ?? (item.activationMode === "timed" && quantity > 0 && !active)) && !pending;
  const durationLabel = item.durationMinutes ? `${item.durationMinutes >= 60 ? `${item.durationMinutes / 60}h` : `${item.durationMinutes}m`}` : null;

  let footer: ReactNode;
  if (source === "shop" && captain) {
    footer = (
      <Button
        type="button"
        tone={canBuy ? "primary" : "secondary"}
        size="sm"
        className={styles.primary}
        data-clan-primary
        disabled={!canBuy}
        onClick={onPurchase}
      >
        {pending ? "Please wait…" : canBuy ? `Buy +1 · ${item.price.toLocaleString()}` : purchaseAllowed === false ? treasury < item.price ? "Not enough Treasury" : "Unavailable" : "Not enough Treasury"}
      </Button>
    );
  } else if (captain && (item.activationMode === "timed" || activationAllowed !== undefined)) {
    footer = (
      <Button
        type="button"
        tone={canActivate ? "primary" : "secondary"}
        size="sm"
        className={styles.primary}
        data-clan-primary
        disabled={!canActivate}
        onClick={onActivate}
      >
        {pending ? "Please wait…" : activationAllowed === false ? blockedLabel ?? "Unavailable" : activationAllowed === undefined && active ? "Effect already active" : quantity <= 0 ? "No item stored" : `${item.activationVerb}${durationLabel ? ` · ${durationLabel}` : ""}`}
      </Button>
    );
  } else {
    footer = (
      <Button type="button" tone="secondary" size="sm" className={styles.primary} data-clan-primary onClick={onClose}>
        {item.contextLabel ?? "Stored for a contextual clan action"}
      </Button>
    );
  }

  return (
    <ClanModal eyebrow={source === "shop" ? "Clan shop" : "Clan inventory"} title={item.name} onClose={onClose} footer={footer}>
      <div className={styles.itemArt}><AssetImage assetKey={item.artKey} className={styles.itemArtImage} /></div>
      <div className={styles.centerCopy}>
        <strong>{item.kind} · {item.rarity}</strong>
        <p>{item.description}</p>
      </div>
      <div className={styles.effectCard}>
        <span>WHAT IT DOES</span>
        <p>{item.effect}</p>
      </div>
      <div className={styles.detailList}>
        <div><span>Price</span><strong>{item.price.toLocaleString()} Treasury</strong></div>
        <div><span>Inventory</span><strong>{quantity > 0 ? `×${quantity} stored` : "None stored"}</strong></div>
        <div><span>Use</span><strong>{item.activationMode === "timed" ? `${item.activationVerb}${durationLabel ? ` · ${durationLabel}` : ""}` : item.contextLabel ?? "Context action"}</strong></div>
        {active ? <div><span>Status</span><strong>Active now</strong></div> : null}
      </div>
    </ClanModal>
  );
}

export function ClanAchievementsSheet({
  achievements,
  onClose,
}: {
  achievements: readonly ClanAchievement[];
  onClose: () => void;
}) {
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length;
  return (
    <ClanModal eyebrow="Headquarters archive" title="Trophy Hall" onClose={onClose}>
      <div className={styles.trophyHero}>
        <AssetImage assetKey="clan.trophyHall" className={styles.trophyHeroArt} />
        <div><span>CLAN ACHIEVEMENTS</span><strong>{unlocked}/{achievements.length} unlocked</strong><p>Shared milestones belong to the clan. Personal achievements remain in your Profile.</p></div>
      </div>
      <div className={styles.achievementList}>
        {achievements.map((achievement) => {
          const ratio = achievement.current === null || achievement.target === null ? null : Math.min(1, achievement.current / Math.max(1, achievement.target));
          return (
            <article key={achievement.id} className={achievement.unlocked ? styles.achievementUnlocked : ""}>
              <div><span>{achievement.available === false ? "UNAVAILABLE" : achievement.unlocked ? "UNLOCKED" : "IN PROGRESS"}</span><strong>{achievement.name}</strong><p>{achievement.description}</p></div>
              <b>{ratio === null ? "—" : `${Math.round(ratio * 100)}%`}</b>
              <i><em style={{ transform: `scaleX(${ratio ?? 0})` }} /></i>
            </article>
          );
        })}
      </div>
    </ClanModal>
  );
}

export function JoinRequestsSheet({
  applicants,
  onClose,
  onAccept,
  onReject,
  pendingAction = false,
  loading = false, error = false, retry, fetching = false,
}: {
  applicants: ClanJoinApplicant[];
  onClose: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  pendingAction?: boolean;
  loading?: boolean;
  error?: boolean;
  retry?: () => unknown;
  fetching?: boolean;
}) {
  const pending = applicants.filter((applicant) => applicant.status === "pending");

  return (
    <ClanModal eyebrow="Captain tools" title="Join requests" onClose={onClose}>
      <div className={styles.requestIntro}>
        <HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={1.55} />
        <div><strong>{loading ? "Join requests" : `${pending.length} pending explorers`}</strong><span>Review each request before opening a place in your roster.</span></div>
      </div>
      <div className={styles.requestList}>
        {loading ? <ClanQueryState loading title="Checking join requests…" /> : error ? <ClanQueryState title="Join requests couldn't refresh." description="Retry before reviewing applicants." retry={retry} busy={fetching} /> : !applicants.length ? <ClanQueryState title="No join requests yet" description="New requests will appear here for review." /> : null}
        {applicants.map((applicant) => (
          <article key={applicant.id} className={styles.request}>
            <div className={styles.avatar} style={{ "--identity-hue": getIdentityHue(applicant.name) } as CSSProperties}>
              <span><AvatarContent owner={`clan-applicant:${applicant.id}`} photoUrl={applicant.avatarUrl} fallback={getIdentityInitials(applicant.name)} /></span>
              <AssetImage assetKey="profile.frame.clan" className={styles.avatarFrame} />
            </div>
            <div className={styles.requestCopy}>
              <div className={styles.requestNameRow}><strong>{applicant.name}</strong>{applicant.username ? <span>@{applicant.username}</span> : null}</div>
              <div className={styles.requestStats}>
                <span><b>LVL</b>{applicant.level}</span>
                <span><b>SCORE</b>{applicant.seasonScore.toLocaleString()}</span>
                <span><b>RANK</b>{clanRankLabel(applicant.globalRank, applicant.rankStatus)}</span>
                <span><b>STREAK</b>{applicant.currentStreak === null ? "Unavailable" : `${applicant.currentStreak}d`}</span>
              </div>
              {applicant.contributionPreview !== null || applicant.medals.length > 0 ? <div className={styles.requestMeta}>
                {applicant.contributionPreview !== null ? <span>Contribution {applicant.contributionPreview.toLocaleString()}</span> : null}
                {applicant.medals.slice(0, 2).map((medal) => <em key={medal}>{medal}</em>)}
              </div> : null}
            </div>
            {applicant.status === "pending" ? (
              <div className={styles.requestActions}>
                <button type="button" disabled={pendingAction} onClick={() => onReject(applicant.id)}>Reject</button>
                <button type="button" disabled={pendingAction} className={styles.accept} onClick={() => onAccept(applicant.id)}>Accept</button>
              </div>
            ) : <em className={styles[applicant.status]}>{applicant.status}</em>}
          </article>
        ))}
      </div>
    </ClanModal>
  );
}
