import {
  Home01Icon,
  Sword01Icon,
  UserCircleIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./GameShell.module.css";

type GameRoute = "/base" | "/earn" | "/clan" | "/arena" | "/profile";

interface GameShellProps {
  children: ReactNode;
  className?: string;
}

const navigation = [
  { to: "/base", label: "Base", icon: Home01Icon },
  { to: "/earn", label: "Earn", icon: Wallet01Icon },
  { to: "/clan", label: "Clan", icon: UserGroupIcon },
  { to: "/arena", label: "Arena", icon: Sword01Icon },
  { to: "/profile", label: "Profile", icon: UserCircleIcon },
] as const;

export function GameShell({ children, className = "" }: GameShellProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { adapter } = useTelegram();

  const openRoute = (to: GameRoute) => {
    if (pathname === to) return;
    adapter.selectionChanged();
    void navigate({ to });
  };

  return (
    <div className={`${styles.shell} ${className}`}>
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
      <nav className={styles.nav} aria-label="Primary game navigation">
        {navigation.map((item) => {
          const active = pathname === item.to;
          return (
            <button
              key={item.to}
              type="button"
              className={`${styles.navItem} ${active ? styles.active : ""}`}
              onClick={() => openRoute(item.to)}
              aria-current={active ? "page" : undefined}
            >
              <span className={styles.iconWrap}>
                <HugeiconsIcon icon={item.icon} size={21} strokeWidth={active ? 1.9 : 1.55} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
