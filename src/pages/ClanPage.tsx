import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import styles from "./GamePages.module.css";

export function ClanPage() {
  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />
        <header className={styles.pageHeader}><span>CLAN NETWORK</span><h1>Build together.</h1><p>Your clan will become the social core of missions, rooms, contributions and war preparation.</p></header>
        <div className={styles.stack}>
          <section className={`${styles.panel} ${styles.heroLock}`}>
            <div className={styles.lockGlyph}>C</div>
            <span className={styles.eyebrow}>CLAN SYSTEM RESERVED</span>
            <h2>Your founding signal is waiting.</h2>
            <p>Discovery, creation and membership flows activate when the Clan World phase is completed.</p>
            <button type="button" className={styles.primaryButton} style={{width:"100%"}}>Preview Clan Network</button>
          </section>
          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Coming online</span><strong>Clan capabilities</strong></div></div>
            <div className={styles.missionList}>
              <article className={styles.mission}><span className={styles.missionIcon}>HQ</span><div><strong>Clan Headquarters</strong><span>Rooms, treasury and shared progression.</span></div><em>Planned</em></article>
              <article className={styles.mission}><span className={styles.missionIcon}>M</span><div><strong>Joint Missions</strong><span>Contribute with members toward shared targets.</span></div><em>Planned</em></article>
              <article className={styles.mission}><span className={styles.missionIcon}>E</span><div><strong>Identity & Emblems</strong><span>Create a visual identity for your community.</span></div><em>Planned</em></article>
            </div>
          </section>
        </div>
      </main>
    </GameShell>
  );
}
