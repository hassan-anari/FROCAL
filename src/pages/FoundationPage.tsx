import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { AssetImage } from "@/design-system/components/AssetImage";
import { AppLoader } from "@/design-system/components/AppLoader";
import { Button } from "@/design-system/primitives/Button";
import { StatusChip } from "@/design-system/primitives/StatusChip";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { content } from "@/content/en";
import styles from "./FoundationPage.module.css";

export function FoundationPage() {
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);
  const activeScenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();

  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(activeScenario),
    queryFn: () => loadBootstrap(activeScenario, adapter.platform),
  });

  if (bootstrap.isPending) return <AppLoader />;

  if (bootstrap.isError) {
    return (
      <main className={styles.bootstrapError}>
        <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
        <div className={styles.scrim} aria-hidden="true" />
        <section>
          <span>Bootstrap interrupted</span>
          <h1>Dexo Land is waiting to reconnect.</h1>
          <p>{bootstrap.error.message}</p>
          <Button onClick={() => void bootstrap.refetch()}>Retry bootstrap</Button>
        </section>
      </main>
    );
  }

  const data = bootstrap.data;
  const progress = Math.min(100, Math.round((data.player.xp / data.player.xpToNextLevel) * 100));

  const initialize = () => {
    adapter.hapticNotice("success");
    setInitialized(true);
  };

  return (
    <main className={styles.stage}>
      <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.orbitOne} aria-hidden="true" />
      <div className={styles.orbitTwo} aria-hidden="true" />

      <header className={styles.header}>
        <AssetImage assetKey="brand.logo" className={styles.logo} />
        <StatusChip>{content.foundation.ready}</StatusChip>
      </header>

      <section className={styles.hero}>
        <motion.div
          className={styles.copy}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className={styles.eyebrow}>{content.foundation.eyebrow}</span>
          <h1>{content.foundation.title}</h1>
          <p className={styles.subtitle}>{content.foundation.subtitle}</p>
          <p className={styles.description}>{content.foundation.description}</p>

          <div className={styles.actions}>
            <Button size="lg" onClick={initialize}>{content.foundation.initialize}</Button>
            <Button size="lg" tone="secondary" onClick={() => navigate({ to: "/diagnostics" })}>
              {content.foundation.diagnostics}
            </Button>
          </div>
        </motion.div>

        <motion.div
          className={styles.coreStage}
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          aria-label="Dexo Land world core"
        >
          <motion.span className={styles.coreOuter} animate={{ rotate: 360 }} transition={{ duration: 28, repeat: Infinity, ease: "linear" }} />
          <motion.span className={styles.coreMiddle} animate={{ rotate: -360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} />
          <motion.span
            className={styles.coreGem}
            animate={{ scale: [0.94, 1.08, 0.94], filter: ["brightness(1)", "brightness(1.3)", "brightness(1)"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className={styles.coreLabel}>PHASE 0</span>
        </motion.div>
      </section>

      <footer className={styles.statusRail}>
        <div>
          <span>Runtime</span>
          <strong>{data.environment}</strong>
        </div>
        <div>
          <span>Season</span>
          <strong>{data.season.status}</strong>
        </div>
        <div>
          <span>Player</span>
          <strong>LV.{data.player.level}</strong>
        </div>
        <div className={styles.progressItem}>
          <span>Foundation sync</span>
          <strong>{progress}%</strong>
          <span className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></span>
        </div>
      </footer>

      <AnimatePresence>
        {initialized ? (
          <motion.div
            className={styles.confirmation}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <span className={styles.confirmationIcon}>✓</span>
            <div>
              <strong>{content.foundation.ready}</strong>
              <p>{content.foundation.next}</p>
            </div>
            <button type="button" onClick={() => setInitialized(false)} aria-label="Close confirmation">×</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
