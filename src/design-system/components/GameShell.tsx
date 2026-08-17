import {
  AdventureIcon,
  ChampionIcon,
  Home01Icon,
  MoneyReceiveSquareIcon,
  UserSquareIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { GameHeader } from "@/design-system/components/GameHeader";
import styles from "./GameShell.module.css";

type GameRoute = "/base" | "/earn" | "/clan" | "/arena" | "/profile";

interface GameShellProps {
  children: ReactNode;
  className?: string;
  hideNavigation?: boolean;
}

const navigation = [
  { to: "/base", label: "Base", icon: Home01Icon, accentClass: styles.accentBase },
  { to: "/earn", label: "Earn", icon: MoneyReceiveSquareIcon, accentClass: styles.accentEarn },
  { to: "/clan", label: "Clan", icon: ChampionIcon, accentClass: styles.accentClan },
  { to: "/arena", label: "Arena", icon: AdventureIcon, accentClass: styles.accentArena },
  { to: "/profile", label: "Profile", icon: UserSquareIcon, accentClass: styles.accentProfile },
] as const;


export function GameShell({ children, className = "", hideNavigation = false }: GameShellProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();
  const [pendingRoute, setPendingRoute] = useState<GameRoute | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPendingRoute(null);
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
  }, [pathname]);

  const openRoute = (to: GameRoute) => {
    if (pathname === to) return;
    setPendingRoute(to);
    startTransition(() => {
      void navigate({ to });
    });
    adapter.selectionChanged();
  };

  return (
    <div className={`${styles.shell} ${className}`}>
      <div className={styles.ambient} aria-hidden="true" />
      <div
        ref={scrollRef}
        data-game-scroll
        className={`${styles.content} ${hideNavigation ? styles.contentFull : ""}`}
      >
        {hideNavigation ? null : <div className={styles.headerSlot}><GameHeader /></div>}
        <div className={`${styles.routeContent} ${hideNavigation ? styles.routeContentFull : ""}`}>{children}</div>
      </div>
      <span key={pathname} className={styles.routeVeil} aria-hidden="true" />
      {hideNavigation ? null : (
        <nav className={styles.nav} aria-label="Primary game navigation">
          {navigation.map((item) => {
            const active = (pendingRoute ?? pathname) === item.to;
            return (
              <button
                key={item.to}
                type="button"
                className={`${styles.navItem} ${item.accentClass} ${active ? styles.active : ""}`}
                onPointerDown={() => { if (pathname !== item.to) setPendingRoute(item.to); }}
                onClick={() => openRoute(item.to)}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navGlyph}>
                  <HugeiconsIcon
                    icon={item.icon}
                    size={24}
                    color="currentColor"
                    strokeWidth={1.5}
                  />
                </span>
                <span className={styles.stationNode} aria-hidden="true" />
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
