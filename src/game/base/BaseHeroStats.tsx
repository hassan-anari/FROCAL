import styles from "./BaseHeroStats.module.css";

interface BaseHeroStatsProps {
  dlxReceived: number | null;
  lifetimeXp: number | null;
}

function valueLabel(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

export function BaseHeroStats({ dlxReceived, lifetimeXp }: BaseHeroStatsProps) {
  return (
    <div className={styles.stats}>
      <div aria-label={lifetimeXp === null ? "Lifetime XP loading" : `${lifetimeXp.toLocaleString()} lifetime XP`}>
        <span>Lifetime XP</span>
        <strong>{valueLabel(lifetimeXp)}</strong>
      </div>
      <div aria-label={dlxReceived === null ? "DLX received loading" : `${dlxReceived.toLocaleString()} DLX received`}>
        <span>DLX Received</span>
        <strong>{valueLabel(dlxReceived)}</strong>
      </div>
    </div>
  );
}
