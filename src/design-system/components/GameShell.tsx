import {
  AdventureIcon,
  ChampionIcon,
  Home01Icon,
  MoneyReceiveSquareIcon,
  UserSquareIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useLayoutEffect, type ReactNode } from "react";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { pulseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
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

const directionKey = "dalexio-nav-direction";

export function GameShell({ children, className = "", hideNavigation = false }: GameShellProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();
  const direction = Number(sessionStorage.getItem(directionKey) ?? "0");

  useLayoutEffect(() => {
    pulseBackgroundMotion(240);
  }, [pathname]);

  const openRoute = (to: GameRoute) => {
    if (pathname === to) return;
    const currentIndex = navigation.findIndex((item) => item.to === pathname);
    const nextIndex = navigation.findIndex((item) => item.to === to);
    sessionStorage.setItem(directionKey, String(Math.sign(nextIndex - currentIndex)));
    adapter.selectionChanged();
    void navigate({ to });
  };

  return (
    <div className={`${styles.shell} ${className}`}>
      <div className={styles.ambient} aria-hidden="true" />
      <motion.div
        key={pathname}
        data-game-scroll
        className={`${styles.content} ${hideNavigation ? styles.contentFull : ""}`}
        initial={{ opacity: 0, x: direction * 6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={mobileMotion.page}
      >
        {children}
      </motion.div>
      {hideNavigation ? null : (
        <nav className={styles.nav} aria-label="Primary game navigation">
          {navigation.map((item) => {
            const active = pathname === item.to;
            return (
              <button
                key={item.to}
                type="button"
                className={`${styles.navItem} ${item.accentClass} ${active ? styles.active : ""}`}
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
