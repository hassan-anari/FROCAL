import { useQuery } from "@tanstack/react-query";
import { DexoStage } from "@/design-system/components/DexoStage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./GamePages.module.css";

export function ProfilePage() {
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();
  const bootstrap = useQuery({ queryKey: queryKeys.bootstrap(scenario), queryFn: () => loadBootstrap(scenario, adapter.platform) });
  const player = bootstrap.data?.player;
  const firstName = adapter.getUser()?.first_name ?? player?.firstName ?? "Explorer";
  const avatar = adapter.getUser()?.photo_url;

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />
        <header className={styles.pageHeader}><span>PLAYER IDENTITY</span><h1>Your seasonal legacy.</h1><p>Progress, medals and Dexo evolution will become the visible history of your journey.</p></header>
        <div className={styles.stack}>
          <section className={styles.panel} style={{display:"grid",justifyItems:"center",textAlign:"center",paddingTop:"1.25rem"}}>
            {avatar ? <img src={avatar} alt="" style={{width:64,height:64,borderRadius:22,objectFit:"cover",border:"1px solid rgba(135,198,255,.25)"}} /> : <div className={styles.lockGlyph} style={{width:70,height:70,borderRadius:23,fontSize:"1.3rem"}}>{firstName.slice(0,1).toUpperCase()}</div>}
            <div style={{marginTop:".7rem"}}><strong style={{display:"block",fontSize:"1.15rem",color:"#f7f9ff"}}>{firstName}</strong><span style={{color:"rgba(174,189,222,.55)",fontSize:".62rem"}}>Founding Explorer · Season One</span></div>
            <div className={styles.statGrid} style={{width:"100%",marginTop:"1rem"}}><div className={styles.stat}><strong>{player?.level ?? 1}</strong><span>Level</span></div><div className={styles.stat}><strong>{player?.xp ?? 120}</strong><span>Total XP</span></div><div className={styles.stat}><strong>0</strong><span>Medals</span></div></div>
          </section>

          <section className={styles.panel} style={{height:220,display:"grid",placeItems:"center"}}>
            <DexoStage character="dexo.level01" characterScale={.7} effect="base" showParticles={false} ariaLabel="Current Dexo" className={styles.profileDexoStage} />
          </section>

          <section className={styles.panel}>
            <div className={styles.panelTitle}><div><span>Showcase</span><strong>Identity slots</strong></div><span style={{color:"rgba(206,217,242,.45)",fontSize:".58rem"}}>0 / 3 equipped</span></div>
            <div className={styles.statGrid}><div className={styles.stat}><strong>—</strong><span>Medal</span></div><div className={styles.stat}><strong>—</strong><span>Title</span></div><div className={styles.stat}><strong>—</strong><span>Frame</span></div></div>
          </section>
        </div>
      </main>
    </GameShell>
  );
}
