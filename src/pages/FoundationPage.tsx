import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AssetImage } from "@/design-system/components/AssetImage";
import { AppLoader } from "@/design-system/components/AppLoader";
import { Button } from "@/design-system/primitives/Button";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { content } from "@/content/en";
import styles from "./FoundationPage.module.css";

export function FoundationPage() {
  const activeScenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();

  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(activeScenario),
    queryFn: () => loadBootstrap(activeScenario, adapter.platform),
  });

  if (bootstrap.isPending) return <AppLoader />;

  if (bootstrap.isError) {
    return (
      <main className={styles.errorState}>
        <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
        <div className={styles.scrim} aria-hidden="true" />
        <section>
          <span>Connection interrupted</span>
          <h1>Dexo Land is waiting.</h1>
          <p>{bootstrap.error.message}</p>
          <Button onClick={() => void bootstrap.refetch()}>Retry</Button>
        </section>
      </main>
    );
  }

  const enterDexoLand = () => {
    adapter.hapticImpact("medium");
    window.dispatchEvent(new CustomEvent("dalexio:enter-dexo-land"));
  };

  return (
    <main className={styles.stage}>
      <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.atmosphere} aria-hidden="true" />

      <header className={styles.header}>
        <AssetImage assetKey="brand.logo" className={styles.logo} />
      </header>

      <section className={styles.hero} aria-labelledby="foundation-title">
        <motion.div
          className={styles.heroCopy}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .62 }}
        >
          <span className={styles.eyebrow}>{content.foundation.eyebrow}</span>
          <h1 id="foundation-title" className={styles.title} aria-label="Dexo Land">
            <span className={styles.titlePrimary}>{content.foundation.titlePrimary}</span>
            <span className={styles.titleSecondary}>{content.foundation.titleSecondary}</span>
          </h1>
          <p className={styles.subtitle}>{content.foundation.subtitle}</p>
        </motion.div>

        <motion.div
          className={styles.ctaArea}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .58, delay: .16 }}
        >
          <Button size="lg" onClick={enterDexoLand}>
            <span>{content.foundation.enter}</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </Button>
        </motion.div>
      </section>
    </main>
  );
}
