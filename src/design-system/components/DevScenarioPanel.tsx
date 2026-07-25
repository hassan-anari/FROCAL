import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { scenarioOptions, useScenarioStore, type ScenarioId } from "@/game/scenarios/scenarioStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./DevScenarioPanel.module.css";

export function DevScenarioPanel() {
  const visible = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_PANEL !== "false";
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const activeScenario = useScenarioStore((state) => state.activeScenario);
  const setScenario = useScenarioStore((state) => state.setScenario);
  const { adapter, stableHeight, colorScheme } = useTelegram();

  if (!visible) return null;

  const onScenarioChange = (scenario: ScenarioId) => {
    setScenario(scenario);
    adapter.selectionChanged();
    void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
  };

  return (
    <aside className={`${styles.root} ${open ? styles.open : ""}`} aria-label="Development scenario controls">
      <button className={styles.toggle} type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Close" : "Dev"}
      </button>
      {open ? (
        <div className={styles.panel}>
          <strong>Scenario lab</strong>
          <label>
            State
            <select value={activeScenario} onChange={(event) => onScenarioChange(event.target.value as ScenarioId)}>
              {scenarioOptions.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>{scenario.label}</option>
              ))}
            </select>
          </label>
          <dl>
            <div><dt>Runtime</dt><dd>{adapter.platform}</dd></div>
            <div><dt>Theme</dt><dd>{colorScheme}</dd></div>
            <div><dt>Stable height</dt><dd>{Math.round(stableHeight)}px</dd></div>
            <div><dt>Data</dt><dd>{import.meta.env.VITE_DATA_SOURCE ?? "local"}</dd></div>
          </dl>
        </div>
      ) : null}
    </aside>
  );
}
