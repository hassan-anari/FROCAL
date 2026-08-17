import { ArrowRight01Icon, Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { useEarnStore } from "@/game/earn/earnStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { usePauseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import styles from "./GameHeader.module.css";

interface GameHeaderProps {
  compact?: boolean;
}

interface NotificationItem {
  id: string;
  type: "mission" | "progress" | "clan" | "season";
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "mission-ready",
    type: "mission",
    title: "Mission updated",
    message: "Your Daily Mission Queue is ready.",
    createdAt: "2m",
    isRead: false,
  },
  {
    id: "dexo-progress",
    type: "progress",
    title: "Dexo progress",
    message: "You earned 120 XP since your last session.",
    createdAt: "18m",
    isRead: false,
  },
  {
    id: "clan-alert",
    type: "clan",
    title: "Clan alert",
    message: "A new clan invitation is waiting.",
    createdAt: "42m",
    isRead: true,
  },
  {
    id: "season-refresh",
    type: "season",
    title: "Season update",
    message: "Season One objectives have been refreshed.",
    createdAt: "1h",
    isRead: true,
  },
];

const returnPathKey = "dalexio-diagnostics-return-path";

export function GameHeader({ compact = false }: GameHeaderProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  usePauseBackgroundMotion(notificationsOpen);
  const [notifications, setNotifications] = useState(initialNotifications);
  const seasonTapCount = useRef(0);
  const seasonTapTimer = useRef<number | null>(null);

  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  const firstName = adapter.getUser()?.first_name ?? bootstrap.data?.player.firstName ?? "Explorer";
  const avatar = adapter.getUser()?.photo_url;
  const earnedLevel = useEarnStore((state) => state.level);
  const level = Math.max(earnedLevel, bootstrap.data?.player.level ?? 1);
  const initials = firstName.trim().slice(0, 1).toUpperCase();
  const unreadCount = useMemo(() => notifications.filter((item) => !item.isRead).length, [notifications]);

  useEffect(() => () => {
    if (seasonTapTimer.current !== null) window.clearTimeout(seasonTapTimer.current);
  }, []);

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
  };

  const markRead = (id: string) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, isRead: true } : item));
    adapter.selectionChanged();
  };

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    adapter.hapticNotice("success");
  };

  return (
    <>
      <header className={`${styles.header} ${compact ? styles.compact : ""}`}>
        <div className={styles.identity}>
          {avatar ? <img src={avatar} alt="" /> : <span className={styles.avatarFallback}>{initials}</span>}
          <div>
            <span>Explorer</span>
            <strong>{firstName}</strong>
          </div>
        </div>

        <button type="button" className={styles.seasonControl} onClick={handleSeasonTap} aria-label="Season One · Neon Reign">
          <span>S1</span>
          <strong>Neon Reign</strong>
        </button>

        <div className={styles.actions}>
          <span className={styles.level}>LV. {level}</span>
          <button type="button" className={styles.iconButton} aria-label="Open notifications" onClick={openNotifications}>
            <HugeiconsIcon icon={Notification03Icon} size={18} strokeWidth={1.65} />
            {unreadCount > 0 ? <i>{unreadCount}</i> : null}
          </button>
        </div>
      </header>

      <div
        className={`${styles.notificationBackdrop} ${notificationsOpen ? styles.notificationOpen : ""}`}
        aria-hidden={!notificationsOpen}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setNotificationsOpen(false);
        }}
      >
        <section
          className={styles.notificationPanel}
          aria-label="Notifications"
          role="dialog"
          aria-modal={notificationsOpen ? "true" : undefined}
        >
          <header className={styles.notificationHeader}>
            <div>
              <span>Activity feed</span>
              <h2>Notifications</h2>
            </div>
            <div className={styles.notificationHeaderActions}>
              {unreadCount > 0 ? <button type="button" className={styles.markAllButton} onClick={markAllRead}>Mark all read</button> : null}
              <button type="button" className={styles.closeButton} onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">×</button>
            </div>
          </header>

          <div className={styles.notificationList}>
            {notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.notificationItem} ${item.isRead ? styles.notificationRead : ""}`}
                onClick={() => markRead(item.id)}
              >
                <span className={`${styles.notificationGlyph} ${styles[item.type]}`}>{item.type.slice(0, 1).toUpperCase()}</span>
                <span className={styles.notificationCopy}>
                  <span>{item.title}</span>
                  <strong>{item.message}</strong>
                  <small>{item.createdAt} ago</small>
                </span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
