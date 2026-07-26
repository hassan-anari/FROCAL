import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import styles from "./GamePages.module.css";

const missions = [
  { glyph: "01", title: "Daily Signal", body: "Check in and stabilize your daily connection.", reward: "+25 XP" },
  { glyph: "02", title: "Typing Protocol", body: "Complete a precision challenge to build momentum.", reward: "+60 XP" },
  { glyph: "03", title: "Invite an Explorer", body: "Expand the Dexo Land community with a referral.", reward: "+100 XP" },
];

export function EarnPage() {
  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />
        <header className={styles.pageHeader}>
          <span>MISSION CONTROL</span>
          <h1>Earn momentum.</h1>
          <p>Complete missions, grow Dexo and shape your position in Season One.</p>
        </header>

        <div className={styles.stack}>
          <section className={styles.panel}>
            <div className={styles.panelTitle}>
              <div><span>Season pathway</span><strong>Starter Protocol</strong></div>
              <span className={styles.statusPill}>Online</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:".45rem",color:"rgba(194,207,237,.68)",fontSize:".62rem"}}><span>1 of 5 objectives</span><strong style={{color:"#75e9ff"}}>20%</strong></div>
            <div className={styles.progressTrack}><i style={{width:"20%"}} /></div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Available now</span><strong>Starter Missions</strong></div><span style={{color:"#8beaff",fontSize:".62rem",fontWeight:750}}>3 tasks</span></div>
            <div className={styles.missionList}>
              {missions.map((mission) => (
                <article key={mission.title} className={styles.mission}>
                  <span className={styles.missionIcon}>{mission.glyph}</span>
                  <div><strong>{mission.title}</strong><span>{mission.body}</span></div>
                  <em>{mission.reward}</em>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Airdrop journey</span><strong>Seasonal Allocation</strong></div><span style={{color:"rgba(209,219,242,.5)",fontSize:".58rem"}}>Preview</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:"1rem",alignItems:"end"}}>
              <div><span style={{display:"block",color:"rgba(170,185,218,.52)",fontSize:".58rem",marginBottom:".2rem"}}>ESTIMATED POSITION</span><strong style={{color:"#f5f7ff",fontSize:"1.3rem",letterSpacing:"-.04em"}}>Building signal</strong></div>
              <button type="button" className={styles.secondaryButton} style={{width:"44px",padding:0}} aria-label="Open allocation preview"><HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.8} /></button>
            </div>
          </section>
        </div>
      </main>
    </GameShell>
  );
}
