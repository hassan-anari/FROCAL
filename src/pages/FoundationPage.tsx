import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { startTransition, useEffect, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { AssetImage } from "@/design-system/components/AssetImage";
import { AppLoader } from "@/design-system/components/AppLoader";
import { Button } from "@/design-system/primitives/Button";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import { content } from "@/content/en";
import { mobileEase, mobileMotion } from "@/design-system/motion/mobileMotion";
import styles from "./FoundationPage.module.css";

const particles = Array.from({ length: 8 }, (_, index) => index);
const phaseOneAssets = [
  "dexo.platform",
  "dexo.base",
  "dexo.guide01",
  "dexo.guide02",
  "dexo.guide03",
  "dexo.level01",
  "dexo.level05",
  "dexo.level10",
  "dexo.level15",
  "dexo.level20",
  "dexo.level30",
  "dexo.personalityCurious",
  "dexo.personalityFocused",
  "dexo.personalityHappy",
  "dexo.personalitySurprised",
  "dexo.personalityVictory",
] as const;

export function FoundationPage() {
  const navigate = useNavigate();
  const onboardingStatus = useOnboardingStore((state) => state.status);
  const { adapter } = useTelegram();
  const [isEntering, setIsEntering] = useState(false);

  const { bootstrap } = useBootstrap();

  useEffect(() => {
    adapter.disableVerticalSwipes();
    return () => adapter.enableVerticalSwipes();
  }, [adapter]);

  useEffect(() => {
    void preloadAssets(phaseOneAssets);
  }, []);

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
    if (isEntering) return;
    adapter.hapticImpact("medium");
    setIsEntering(true);

    window.setTimeout(() => {
      startTransition(() => { void navigate({ to: onboardingStatus === "completed" ? "/base" : "/onboarding" }); });
    }, 520);
  };

  return (
    <main className={`${styles.stage} ${isEntering ? styles.isEntering : ""}`}>
      <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.cityGlow} aria-hidden="true" />
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.particles} aria-hidden="true">
        {particles.map((particle) => <i key={particle} />)}
      </div>
      <div className={styles.entryVeil} aria-hidden="true" />

      <header className={styles.header}>
        <AssetImage assetKey="brand.logo" className={styles.logo} />
      </header>

      <section className={styles.hero} aria-labelledby="foundation-title">
        <motion.div
          className={styles.heroCopy}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: mobileMotion.cinematic.duration, ease: mobileEase }}
        >
          <span className={styles.eyebrow}>{content.foundation.eyebrow}</span>
          <div className={styles.titleAura} aria-hidden="true" />
          <h1 id="foundation-title" className={styles.title} aria-label="Dexo Land">
            <span className={styles.titlePrimary}>{content.foundation.titlePrimary}</span>
            <span className={styles.titleSecondary}>{content.foundation.titleSecondary}</span>
          </h1>
          <p className={styles.subtitle}>{content.foundation.subtitle}</p>
        </motion.div>

        <motion.div
          className={styles.ctaArea}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .44, delay: .12, ease: mobileEase }}
        >
          <Button
            size="lg"
            className={styles.enterButton}
            trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={19} strokeWidth={1.9} />}
            onClick={enterDexoLand}
            disabled={isEntering}
          >
            {content.foundation.enter}
          </Button>
        </motion.div>
      </section>
    </main>
  );
}
