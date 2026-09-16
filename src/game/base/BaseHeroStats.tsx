import styles from "./BaseHeroStats.module.css";

interface BaseHeroStatsProps {
  dlxReceived: number;
  lifetimeXp: number;
}

export function BaseHeroStats({ dlxReceived, lifetimeXp }: BaseHeroStatsProps) {
  return (
    <div className={styles.stats}>
      <div aria-label={`${lifetimeXp.toLocaleString()} lifetime XP`}>
        <span>Lifetime XP</span>
        <strong>{lifetimeXp.toLocaleString()}</strong>
      </div>
      <div aria-label={`${dlxReceived.toLocaleString()} DLX received`}>
        <span>DLX Received</span>
        <strong>{dlxReceived.toLocaleString()}</strong>
      </div>
    </div>
  );
}
