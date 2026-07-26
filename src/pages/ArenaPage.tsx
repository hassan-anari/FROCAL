import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import styles from "./GamePages.module.css";

export function ArenaPage() {
  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />
        <header className={styles.pageHeader}><span>COMPETITION CORE</span><h1>Prepare for Arena.</h1><p>Clan strategy, defence setup and seasonal competition will converge here.</p></header>
        <div className={styles.stack}>
          <section className={`${styles.panel} ${styles.heroLock}`}>
            <div className={styles.lockGlyph}>A</div>
            <span className={styles.eyebrow}>ARENA PROTOCOL</span>
            <h2>Matchmaking is offline.</h2>
            <p>The Arena activates after Clan foundations and the battle state machine are complete.</p>
            <span className={styles.statusPill}>Systems preparing</span>
          </section>
          <section className={styles.statGrid}>
            <div className={styles.stat}><strong>—</strong><span>Rank</span></div>
            <div className={styles.stat}><strong>0</strong><span>Battles</span></div>
            <div className={styles.stat}><strong>0%</strong><span>Win rate</span></div>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Battle flow</span><strong>Protocol sequence</strong></div></div>
            <div className={styles.missionList}>
              <article className={styles.mission}><span className={styles.missionIcon}>1</span><div><strong>Find opponent</strong><span>Match clans with compatible seasonal power.</span></div><em>Locked</em></article>
              <article className={styles.mission}><span className={styles.missionIcon}>2</span><div><strong>Prepare strategy</strong><span>Select defence, items and contribution goals.</span></div><em>Locked</em></article>
              <article className={styles.mission}><span className={styles.missionIcon}>3</span><div><strong>Resolve battle</strong><span>Track active battle state and receive results.</span></div><em>Locked</em></article>
            </div>
          </section>
        </div>
      </main>
    </GameShell>
  );
}
