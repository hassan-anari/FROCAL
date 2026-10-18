import { usePlayerProgression } from "@/integrations/api/usePlayerProgression";
import { safeDestination } from "@/integrations/api/safeNavigation";
import { QueryContinuation } from "@/design-system/performance/QueryContinuation";
import { showFeedback, useQueryFeedback } from "./TransientFeedback";
import { profilePhotoUrl } from "@/integrations/api/bootstrapContract";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { ArrowRight01Icon, Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTapSession } from "@/game/base/tapV2/TapSessionProvider";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import {
  loadNotifications,
  notificationDisplay,
  markNotificationRead,
  markAllNotificationsRead,
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

  const notifications = useInfiniteQuery({
    queryKey: queryKeys.notifications(scope),
    queryFn: ({ pageParam, signal }) => loadNotifications(initData, 20, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: page => page.next_cursor ?? undefined,
    enabled: remoteData && adapter.isTelegram && Boolean(initData) && scope.player !== "unverified",
    staleTime: 15_000,
  });

  useQueryFeedback(notificationsOpen ? notifications.error : null, "Notifications couldn't load. Please try again.");

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
  const progression = usePlayerProgression();
  const actualStage =
    remoteData ? progression.stage : tap?.view.progression?.stage ?? bootstrap.data?.dexo.stage ?? profile.data?.progression.dexo_stage ?? "newborn";
  const stageLabel = actualStage ? actualStage.toUpperCase() : "—";
  const level = remoteData
    ? progression.level
    : bootstrap.data?.player.level ?? 1;
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "D";
  const season = bootstrap.data?.season;
  const seasonCode = season ? seasonBadge(season.id) : "S—";
  const seasonTitle = season?.name ?? "Season";
  const notificationItems = notifications.data?.pages.flatMap(page => page.items) ?? [];
  const unreadCount = useMemo(
    () => notifications.data?.pages[0]?.unread_count ?? notificationItems.filter((item) => item.unread).length,
    [notifications.data, notificationItems],
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
    queryClient.setQueryData<InfiniteData<NotificationPage>>(queryKeys.notifications(scope), (current) =>
      current ? { ...current, pages: current.pages.map(page => ({ ...page, items: page.items.map(updater) })) } : current,
    );
  };

  const pendingReads = useRef(new Set<string>());
  const markRead = async (id: string) => {
    if (pendingReads.current.has(id)) return false;
    pendingReads.current.add(id);
    adapter.selectionChanged();
    try {
      const confirmed = await markNotificationRead(initData, id);
      updateNotificationCache(item => item.id === id ? confirmed : item);
      await notifications.refetch();
      return true;
    } catch { showFeedback("This notification couldn't be updated. Please try again."); }
    finally { pendingReads.current.delete(id); }
  };

  const pendingAll = useRef(false);
  const markAllRead = async () => {
    if (pendingAll.current) return;
    pendingAll.current = true;
    try {
      if (notifications.data?.pages[0]?.unread_count === undefined) {
        await Promise.allSettled(notificationItems.filter(item => item.unread).map(item => markRead(item.id)));
      } else {
        await markAllNotificationsRead(initData);
      }
      await notifications.refetch();
    } catch { showFeedback("Notifications couldn't be updated. Please try again."); }
    finally { pendingAll.current = false; }
  };

  const openNotification = async (item: LiveNotification) => {
    if (item.unread && !await markRead(item.id)) return;
    // Only the documented deep_link can select an existing internal route.
    // Payload URLs are never consumed, even when the link is absent or unsafe.
    const link = item.type === "CLAN_INVITE_READY" ? "/clan" : item.deep_link?.path;
    const destination = link?.startsWith("/") ? safeDestination(link) : null;
    if (destination?.kind === "internal") {
      setNotificationsOpen(false);
      void navigate({ to: destination.path });
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

                <div className={styles.notificationList} data-notification-list>
                  {notificationItems.length === 0 ? (
                    <div className={styles.notificationEmpty}>No notifications yet.</div>
                  ) : (
                    notificationItems.map((item, index) => {
                      const tone = notificationTone(item.type);
                      const copy = notificationDisplay(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`${styles.notificationItem} ${item.unread ? "" : styles.notificationRead}`}
                          onClick={() => void openNotification(item)}
                        >
                          <span className={`${styles.notificationGlyph} ${styles[tone]}`}>{String(index + 1).padStart(2, "0")}</span>
                          <span className={styles.notificationCopy}>
                            <span>{copy.title}</span>
                            <strong>{copy.body}</strong>
                            <small>{relativeTime(item.created_at)} ago</small>
                          </span>
                          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
                        </button>
                      );
                    })
                  )}
                  <QueryContinuation selector="[data-notification-list] > button:last-of-type" hasNext={notifications.hasNextPage && !notifications.isFetchNextPageError} fetching={notifications.isFetching} load={notifications.fetchNextPage} />
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
