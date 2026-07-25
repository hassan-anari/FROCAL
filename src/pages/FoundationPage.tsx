import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
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
  const [verified, setVerified] = useState(false);
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

  const user = adapter.getUser();
  const verifyFoundation = () => {
    adapter.hapticNotice("success");
    setVerified(true);
  };

  return (
    <main className={styles.stage}>
      <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.lightColumn} aria-hidden="true" />
      <div className={styles.particles} aria-hidden="true" />

      <header className={styles.header}>
        <AssetImage assetKey="brand.logo" className={styles.logo} />
        <span className={styles.connectionPill}>
          <i aria-hidden="true" />
          {adapter.isTelegram ? "Telegram connected" : "Browser preview"}
        </span>
      </header>

      <section className={styles.worldStage} aria-labelledby="foundation-title">
        <motion.div
          className={styles.copy}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <span className={styles.eyebrow}>{content.foundation.eyebrow}</span>
          <h1 id="foundation-title">{content.foundation.title}</h1>
          <p>{content.foundation.subtitle}</p>
        </motion.div>

        <motion.div
          className={styles.coreStage}
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.72, delay: 0.12 }}
          aria-label="Dexo Land foundation core"
        >
          <motion.span
            className={styles.coreOuter}
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className={styles.coreMiddle}
            animate={{ rotate: -360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className={styles.coreGem}
            animate={{ scale: [0.96, 1.06, 0.96], filter: ["brightness(1)", "brightness(1.22)", "brightness(1)"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className={styles.coreLabel}>FOUNDATION</span>
        </motion.div>

        <div className={styles.actionArea}>
          <p className={styles.description}>{content.foundation.description}</p>
          <Button size="lg" onClick={verifyFoundation} disabled={verified}>
            {verified ? content.foundation.verified : content.foundation.initialize}
          </Button>
          <span className={styles.identity}>
            {user?.username ? `@${user.username}` : user?.first_name ?? "Vercel preview"}
          </span>
        </div>
      </section>

      <AnimatePresence>
        {verified ? (
          <motion.div
            className={styles.confirmation}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            role="status"
          >
            <span className={styles.confirmationIcon}>✓</span>
            <div>
              <strong>{content.foundation.ready}</strong>
              <p>{content.foundation.next}</p>
            </div>
            <button type="button" onClick={() => setVerified(false)} aria-label="Close message">×</button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
