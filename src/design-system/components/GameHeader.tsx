import { Notification03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./GameHeader.module.css";

interface GameHeaderProps {
  compact?: boolean;
}

export function GameHeader({ compact = false }: GameHeaderProps) {
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  const firstName = adapter.getUser()?.first_name ?? bootstrap.data?.player.firstName ?? "Explorer";
  const avatar = adapter.getUser()?.photo_url;
  const level = bootstrap.data?.player.level ?? 1;
  const initials = firstName.trim().slice(0, 1).toUpperCase();

  return (
    <header className={`${styles.header} ${compact ? styles.compact : ""}`}>
      <div className={styles.identity}>
        {avatar ? <img src={avatar} alt="" /> : <span className={styles.avatarFallback}>{initials}</span>}
        <div>
          <span>Explorer</span>
          <strong>{firstName}</strong>
        </div>
      </div>

      <div className={styles.actions}>
        <span className={styles.season}>S1</span>
        <span className={styles.level}>LV. {level}</span>
        <button type="button" className={styles.iconButton} aria-label="Notifications">
          <HugeiconsIcon icon={Notification03Icon} size={18} strokeWidth={1.6} />
          <i />
        </button>
      </div>
    </header>
  );
}
