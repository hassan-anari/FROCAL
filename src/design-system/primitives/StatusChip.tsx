import type { ReactNode } from "react";
import styles from "./StatusChip.module.css";

export function StatusChip({ children, tone = "online" }: { children: ReactNode; tone?: "online" | "muted" | "warning" }) {
  return (
    <span className={`${styles.chip} ${styles[tone]}`}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  );
}
