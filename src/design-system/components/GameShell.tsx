import {
  Home01Icon,
  Sword01Icon,
  UserCircleIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./GameShell.module.css";

type GameRoute = "/base" | "/earn" | "/clan" | "/arena" | "/profile";

interface GameShellProps {
  children: ReactNode;
  className?: string;
  hideNavigation?: boolean;
}

const navigation = [
  { to: "/base", label: "Base", icon: Home01Icon },
  { to: "/earn", label: "Earn", icon: Wallet01Icon },
  { to: "/clan", label: "Clan", icon: UserGroupIcon },
  { to: "/arena", label: "Arena", icon: Sword01Icon },
  { to: "/profile", label: "Profile", icon: UserCircleIcon },
] as const;

const directionKey = "dalexio-nav-direction";

export function GameShell({ children, className = "", hideNavigation = false }: GameShellProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();
  const direction = Number(sessionStorage.getItem(directionKey) ?? "0");

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
        initial={{ opacity: 0, x: direction * 10, scale: 0.998 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
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
                className={`${styles.navItem} ${active ? styles.active : ""}`}
                onClick={() => openRoute(item.to)}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.iconWrap}>
                  <HugeiconsIcon icon={item.icon} size={22} strokeWidth={active ? 1.9 : 1.55} />
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
