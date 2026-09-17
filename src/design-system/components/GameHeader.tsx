import { ArrowRight01Icon, Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BASE_TAP_POINTS_EVENT,
  readBaseTapDailyPoints,
} from "@/game/base/useBaseTapExperience";
import { projectS1Progression } from "@/game/base/progressionContract";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import {
  loadNotifications,
  markNotificationRead,
  type NotificationItem,
} from "@/integrations/api/notifications";
import { loadProfileOverview } from "@/integrations/api/profile";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { usePauseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import styles from "./GameHeader.module.css";

interface GameHeaderProps {
  compact?: boolean;
}

type NotificationTone = "mission" | "progress" | "clan" | "season";

const returnPathKey = "dalexio-diagnostics-return-path";

function humanizeKey(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function seasonCodeLabel(value: string): string {
  const match = value.match(/^s(\d+)/i);
  return match ? `S${match[1]}` : value.toUpperCase();
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "now";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function notificationTone(type: string): NotificationTone {
  const value = type.toLowerCase();
  if (value.includes("mission")) return "mission";
  if (value.includes("clan")) return "clan";
  if (value.includes("season") || value.includes("dlx") || value.includes("epoch")) return "season";
  return "progress";
}

export function GameHeader({ compact = false }: GameHeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [optimisticTapPoints, setOptimisticTapPoints] = useState(0);
  usePauseBackgroundMotion(notificationsOpen);
  const seasonTapCount = useRef(0);
  const seasonTapTimer = useRef<number | null>(null);

  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform, initData),
  });

  const profile = useQuery({
    queryKey: queryKeys.profileOverview,
    queryFn: () => loadProfileOverview(initData),
    enabled: adapter.isTelegram && Boolean(initData),
    staleTime: 30_000,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => loadNotifications(initData),
    enabled: adapter.isTelegram && Boolean(initData),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const playerId = bootstrap.data?.player.id ?? "";
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((item) => item.unread).length,
    [notifications],
  );

  useEffect(() => {
    if (!playerId) return;
    setOptimisticTapPoints(readBaseTapDailyPoints(playerId));

    const handlePoints = (event: Event) => {
      const detail = (event as CustomEvent<{ playerId?: string; points?: number }>).detail;
      if (detail?.playerId !== playerId || typeof detail.points !== "number") return;
      setOptimisticTapPoints(detail.points);
    };
    window.addEventListener(BASE_TAP_POINTS_EVENT, handlePoints);
    return () => window.removeEventListener(BASE_TAP_POINTS_EVENT, handlePoints);
  }, [playerId]);

  useEffect(
    () => () => {
      if (seasonTapTimer.current !== null) window.clearTimeout(seasonTapTimer.current);
    },
    [],
  );

  const telegramUser = adapter.getUser();
  const identity = profile.data?.identity;
  const firstName = identity?.first_name || telegramUser?.first_name || bootstrap.data?.player.firstName || "Explorer";
  const avatar = identity?.photo_url || telegramUser?.photo_url || null;
  const title = humanizeKey(profile.data?.customization.active_title || "explorer");
  const serverLifetime = profile.data?.progression.lifetime_points ?? bootstrap.data?.player.lifetimeXp ?? 0;
  const level = projectS1Progression(serverLifetime + optimisticTapPoints).level;
  const initials = firstName.trim().slice(0, 1).toUpperCase();
  const seasonCode = seasonCodeLabel(bootstrap.data?.season.id ?? "S1");
  const seasonName = bootstrap.data?.season.name ?? "Season 1";

  const openDiagnostics = () => {
    sessionStorage.setItem(returnPathKey, pathname);
    adapter.hapticImpact("medium");
    void navigate({ to: "/diagnostics" });
  };

  const handleSeasonTap = () => {
    seasonTapCount.current += 1;
    if (seasonTapTimer.current !== null) window.clearTimeout(seasonTapTimer.current);

    if (seasonTapCount.current >= 3) {
      seasonTapCount.current = 0;
      openDiagnostics();
      return;
    }

    seasonTapTimer.current = window.setTimeout(() => {
      seasonTapCount.current = 0;
      seasonTapTimer.current = null;
    }, 620);
  };

  const openNotifications = () => {
    adapter.selectionChanged();
    setNotificationsOpen(true);
    void notificationsQuery.refetch();
  };

  const markRead = async (item: NotificationItem) => {
    if (!item.unread) return;
    await markNotificationRead(item.id, initData);
    adapter.selectionChanged();
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  };

  const markAllRead = async () => {
    const unread = notifications.filter((item) => item.unread);
    if (unread.length === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((item) => markNotificationRead(item.id, initData)));
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      adapter.hapticNotice("success");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <header className={`${styles.header} ${compact ? styles.compact : ""}`}>
        <div className={styles.identity}>
          {avatar ? <img src={avatar} alt="" /> : <span className={styles.avatarFallback}>{initials}</span>}
          <div>
            <span>{title}</span>
            <strong>{firstName}</strong>
          </div>
        </div>

        <button
          type="button"
          className={styles.seasonControl}
          onClick={handleSeasonTap}
          aria-label={`${seasonCode} · ${seasonName}`}
        >
          <span>{seasonCode}</span>
          <strong>{seasonName}</strong>
        </button>

        <div className={styles.actions}>
          <span className={styles.level}>LV. {level}</span>
          <button type="button" className={styles.iconButton} aria-label="Open notifications" onClick={openNotifications}>
            <HugeiconsIcon icon={Notification03Icon} size={18} strokeWidth={1.65} />
            {unreadCount > 0 ? <i>{unreadCount}</i> : null}
          </button>
        </div>
      </header>

      {typeof document !== "undefined" ? createPortal(
        <AnimatePresence>
          {notificationsOpen ? (
            <motion.div
              className={styles.notificationBackdrop}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={mobileMotion.micro}
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setNotificationsOpen(false);
              }}
            >
              <motion.section
                className={styles.notificationPanel}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={mobileMotion.overlay}
                aria-label="Notifications"
              >
                <header className={styles.notificationHeader}>
                  <div>
                    <span>Activity feed</span>
                    <h2>Notifications</h2>
                  </div>
                  <div className={styles.notificationHeaderActions}>
                    {unreadCount > 0 ? (
                      <button type="button" className={styles.markAllButton} onClick={() => void markAllRead()} disabled={markingAll}>
                        Mark all read
                      </button>
                    ) : null}
                    <button type="button" className={styles.closeButton} onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
                  </div>
                </header>

                <div className={styles.notificationList}>
                  {notifications.map((item) => {
                    const tone = notificationTone(item.type);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`${styles.notificationItem} ${item.unread ? "" : styles.notificationRead}`}
                        onClick={() => void markRead(item)}
                      >
                        <span className={`${styles.notificationGlyph} ${styles[tone]}`}>{tone.slice(0, 1).toUpperCase()}</span>
                        <span className={styles.notificationCopy}>
                          <span>{item.title}</span>
                          <strong>{item.body}</strong>
                          <small>{relativeTime(item.created_at)} ago</small>
                        </span>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
                      </button>
                    );
                  })}
                  {!notificationsQuery.isLoading && notifications.length === 0 ? (
                    <div className={styles.notificationEmpty}>No notifications yet.</div>
                  ) : null}
                </div>
              </motion.section>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      ) : null}
    </>
  );
}
