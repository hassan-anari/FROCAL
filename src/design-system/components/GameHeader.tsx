import { profilePhotoUrl } from "@/integrations/api/bootstrapContract";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { ArrowRight01Icon, Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import {
  loadNotifications,
  markNotificationRead,
  type LiveNotification,
  type NotificationPage,
} from "@/integrations/api/notifications";
import { useProfileOverview } from "@/integrations/api/useProfileOverview";
import { useAvatarSource } from "@/integrations/api/useAvatarSource";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { usePauseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import styles from "./GameHeader.module.css";

interface GameHeaderProps {
  compact?: boolean;
}

const returnPathKey = "dalexio-diagnostics-return-path";

function seasonBadge(id: string): string {
  const match = id.match(/^s(\d+)/i);
  return match ? `S${match[1]}` : id.toUpperCase();
}

function notificationTone(type: string): "mission" | "progress" | "clan" | "season" {
  const normalized = type.toLowerCase();
  if (normalized.includes("mission")) return "mission";
  if (normalized.includes("clan")) return "clan";
  if (normalized.includes("season")) return "season";
  return "progress";
}

function relativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "now";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function GameHeader({ compact = false }: GameHeaderProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();
  const initData = adapter.getInitData();
  const remoteData = isRemoteDataSource();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const tap = useTapSession();
  usePauseBackgroundMotion(notificationsOpen);
  const seasonTapCount = useRef(0);
  const seasonTapTimer = useRef<number | null>(null);

  const { bootstrap, scope } = useBootstrap();

  const profile = useProfileOverview();

  const notifications = useQuery({
    queryKey: queryKeys.notifications(scope),
    queryFn: () => loadNotifications(initData),
    enabled: remoteData && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified",
    staleTime: 15_000,
  });

  const bootstrapPlayerId = bootstrap.data?.player.id ?? "pending-player";

  const telegramUser = remoteData ? null : adapter.getUser();
  const identity = profile.data?.identity;
  const displayName =
    bootstrap.data?.player.displayName ||
    [identity?.first_name, identity?.last_name].filter(Boolean).join(" ").trim() ||
    telegramUser?.first_name ||
    "—";
  const avatar = bootstrap.data?.remote?.player.photo_url !== undefined
    ? bootstrap.data.player.avatarUrl
    : profilePhotoUrl(identity?.photo_url) ?? telegramUser?.photo_url ?? null;
  const avatarSource = useAvatarSource(bootstrapPlayerId, avatar);
  const actualStage =
    tap?.view.progression?.stage ?? bootstrap.data?.dexo.stage ?? profile.data?.progression.dexo_stage ?? "newborn";
  const stageLabel = actualStage ? actualStage.toUpperCase() : "—";
  const level = remoteData
    ? (tap?.view.progression?.level ?? bootstrap.data?.player.level ?? profile.data?.progression.level ?? 1)
    : bootstrap.data?.player.level ?? 1;
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "D";
  const season = bootstrap.data?.season;
  const seasonCode = season ? seasonBadge(season.id) : "S—";
  const seasonTitle = season?.name ?? "Season";
  const notificationItems = notifications.data?.items ?? [];
  const unreadCount = useMemo(
    () => notificationItems.filter((item) => item.unread).length,
    [notificationItems],
  );

  useEffect(
    () => () => {
      if (seasonTapTimer.current !== null) window.clearTimeout(seasonTapTimer.current);
    },
    [],
  );

  const openDiagnostics = () => {
    sessionStorage.setItem(returnPathKey, pathname);
    adapter.hapticImpact("medium");
    void navigate({ to: "/diagnostics" });
  };

  const handleSeasonTap = () => {
    if (!import.meta.env.DEV) return;
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
    void notifications.refetch();
  };

  const updateNotificationCache = (updater: (item: LiveNotification) => LiveNotification) => {
    queryClient.setQueryData<NotificationPage>(queryKeys.notifications(scope), (current) =>
      current ? { ...current, items: current.items.map(updater) } : current,
    );
  };

  const markRead = async (id: string) => {
    const previous = queryClient.getQueryData<NotificationPage>(queryKeys.notifications(scope));
    updateNotificationCache((item) =>
      item.id === id ? { ...item, unread: false, read_at: item.read_at ?? new Date().toISOString() } : item,
    );
    adapter.selectionChanged();
    try {
      await markNotificationRead(initData, id);
    } catch {
      if (previous) queryClient.setQueryData(queryKeys.notifications(scope), previous);
    }
  };

  const markAllRead = async () => {
    const unread = notificationItems.filter((item) => item.unread);
    if (unread.length === 0) return;
    const previous = queryClient.getQueryData<NotificationPage>(queryKeys.notifications(scope));
    updateNotificationCache((item) =>
      item.unread ? { ...item, unread: false, read_at: item.read_at ?? new Date().toISOString() } : item,
    );
    adapter.hapticNotice("success");
    const results = await Promise.allSettled(
      unread.map((item) => markNotificationRead(initData, item.id)),
    );
    if (results.some((result) => result.status === "rejected") && previous) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications(scope) });
    }
  };

  return (
    <>
      <header className={`${styles.header} ${compact ? styles.compact : ""}`}>
        <div className={styles.identity}>
          {avatarSource.src ? <img src={avatarSource.src} onError={avatarSource.onError} referrerPolicy="no-referrer" alt="" /> : <span className={styles.avatarFallback}>{initials}</span>}
          <div>
            <span>{stageLabel}</span>
            <strong>{displayName}</strong>
          </div>
        </div>

        <button
          type="button"
          className={styles.seasonControl}
          onClick={import.meta.env.DEV ? handleSeasonTap : undefined}
          aria-label={`${seasonCode} ${seasonTitle}`}
        >
          <span>{seasonCode}</span>
          <strong>{seasonTitle}</strong>
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
                      <button type="button" className={styles.markAllButton} onClick={() => void markAllRead()}>
                        Mark all read
                      </button>
                    ) : null}
                    <button type="button" className={styles.closeButton} onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
                  </div>
                </header>

                <div className={styles.notificationList}>
                  {notificationItems.length === 0 ? (
                    <div className={styles.notificationEmpty}>No notifications yet.</div>
                  ) : (
                    notificationItems.map((item) => {
                      const tone = notificationTone(item.type);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.notificationItem} ${item.unread ? "" : styles.notificationRead}`}
                          onClick={() => void markRead(item.id)}
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
                    })
                  )}
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
