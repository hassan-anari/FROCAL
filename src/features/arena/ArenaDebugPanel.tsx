import { useState } from "react";
import { useArenaWarStore, warStageOrder } from "@/game/arena/arenaStore";
import type { ArenaWarResult, ArenaWarStage, ArenaWarStatus } from "@/game/arena/types";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ArenaDebugPanel.module.css";

export function isArenaDebugVisible(): boolean {
  return import.meta.env.DEV;
}

const stageLabels: Record<ArenaWarStage, string> = {
  matchmaking: "01 Matchmaking",
  opponent: "02 Opponent found",
  preview: "03 Opponent preview",
  confirm: "04 Confirmation",
  prepare: "05 Preparation",
  items: "06 Item selection",
  countdown: "07 Countdown",
  battle: "08 Active battle",
  final: "09 Final moments",
  result: "10 Result",
  defence: "11 Defence setup",
  status: "12 Post-war status",
};

export function ArenaDebugPanel() {
  const [open, setOpen] = useState(false);
  const { adapter } = useTelegram();
  const debugUnlocked = useArenaWarStore((state) => state.debugUnlocked);
  const setDebugUnlocked = useArenaWarStore((state) => state.setDebugUnlocked);
  const stage = useArenaWarStore((state) => state.stage);
  const setStage = useArenaWarStore((state) => state.setStage);
  const result = useArenaWarStore((state) => state.result);
  const setResult = useArenaWarStore((state) => state.setResult);
  const status = useArenaWarStore((state) => state.status);
  const setStatus = useArenaWarStore((state) => state.setStatus);
  const battleProgress = useArenaWarStore((state) => state.battleProgress);
  const setBattleProgress = useArenaWarStore((state) => state.setBattleProgress);
  const enemyProgress = useArenaWarStore((state) => state.enemyProgress);
  const setEnemyProgress = useArenaWarStore((state) => state.setEnemyProgress);
  const resetWar = useArenaWarStore((state) => state.resetWar);

  if (!isArenaDebugVisible()) return null;

  const selectStage = (value: ArenaWarStage) => {
    setDebugUnlocked(true);
    setStage(value);
    adapter.selectionChanged();
  };

  return (
    <aside className={`${styles.root} ${open ? styles.open : ""}`} aria-label="Arena debug controls">
      <button type="button" className={styles.toggle} onClick={() => setOpen((value) => !value)}>{open ? "Close" : "War Debug"}</button>
      {open ? (
        <div className={styles.panel}>
          <header><span>PHASE 6 LAB</span><strong>Arena / Warfront</strong></header>

          <label className={styles.unlockRow}>
            <input type="checkbox" checked={debugUnlocked} onChange={(event) => setDebugUnlocked(event.target.checked)} />
            <span>Unlock Season 2 simulation</span>
          </label>

          <label>
            State
            <select value={stage} onChange={(event) => selectStage(event.target.value as ArenaWarStage)}>
              {warStageOrder.map((item) => <option key={item} value={item}>{stageLabels[item]}</option>)}
            </select>
          </label>

          <div className={styles.twoCol}>
            <label>Result<select value={result} onChange={(event) => setResult(event.target.value as ArenaWarResult)}><option value="victory">Victory</option><option value="defeat">Defeat</option><option value="draw">Draw</option><option value="successfulAttack">Successful attack</option><option value="successfulDefence">Successful defence</option></select></label>
            <label>Status<select value={status} onChange={(event) => setStatus(event.target.value as ArenaWarStatus)}><option value="protection">Protection</option><option value="recovery">Recovery</option><option value="reward">Reward ready</option><option value="debuff">Debuff</option></select></label>
          </div>

          <div className={styles.sliderGroup}>
            <label>Our progress <b>{battleProgress}%</b><input type="range" min="0" max="100" value={battleProgress} onChange={(event) => setBattleProgress(Number(event.target.value))} /></label>
            <label>Rival progress <b>{enemyProgress}%</b><input type="range" min="0" max="100" value={enemyProgress} onChange={(event) => setEnemyProgress(Number(event.target.value))} /></label>
          </div>

          <button type="button" className={styles.reset} onClick={() => { resetWar(); adapter.hapticImpact("light"); }}>Reset war flow</button>
          <p>This lab is available only in local development and CI fixtures.</p>
        </div>
      ) : null}
    </aside>
  );
}
