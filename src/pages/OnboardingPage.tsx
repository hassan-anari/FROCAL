import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { AssetImage } from "@/design-system/components/AssetImage";
import { AppLoader } from "@/design-system/components/AppLoader";
import { DexoStage } from "@/design-system/components/DexoStage";
import { Button } from "@/design-system/primitives/Button";
import { useOnboardingStore, onboardingStepOrder } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import type { AssetKey } from "@/assets/registry";
import styles from "./OnboardingPage.module.css";

const guideScenes: Array<{
  eyebrow: string;
  title: string;
  body: string;
  asset: AssetKey;
  scale: number;
}> = [
  {
    eyebrow: "PLAY",
    title: "Complete missions.",
    body: "Every action creates momentum for you and Dexo.",
    asset: "dexo.guide02",
    scale: 1.02,
  },
  {
    eyebrow: "GROW",
    title: "Evolve together.",
    body: "Levels, achievements and seasons shape your companion.",
    asset: "dexo.personalityFocused",
    scale: .98,
  },
  {
    eyebrow: "UNITE",
    title: "Build with your clan.",
    body: "Shared progress becomes a stronger world for everyone.",
    asset: "dexo.guide03",
    scale: 1.02,
  },
  {
    eyebrow: "COMPETE",
    title: "Rise through the season.",
    body: "Your consistency and teamwork define your legacy.",
    asset: "dexo.personalityCurious",
    scale: .97,
  },
];

const stepContent = {
  welcome: {
    eyebrow: "FIRST CONTACT",
    title: "Your journey is about to begin.",
    body: "A new world is online — and someone has been waiting for you.",
    asset: "dexo.guide01" as AssetKey,
    scale: 1.04,
  },
  meet: {
    eyebrow: "MEET DEXO",
    title: "A companion that grows with you.",
    body: "Dexo reacts to your progress, your achievements and every season you complete.",
    asset: "dexo.base" as AssetKey,
    scale: 1.05,
  },
  acquired: {
    eyebrow: "COMPANION ACQUIRED",
    title: "Dexo joined your journey.",
    body: "From this moment forward, every mission shapes both of you.",
    asset: "dexo.personalityHappy" as AssetKey,
    scale: .96,
  },
  ready: {
    eyebrow: "DEXO LAND ONLINE",
    title: "Your world is ready.",
    body: "Step into Base and begin building your seasonal legacy.",
    asset: "dexo.personalityVictory" as AssetKey,
    scale: .96,
  },
};

const onboardingAssets = [
  "dexo.platform",
  "dexo.base",
  "dexo.guide01",
  "dexo.guide02",
  "dexo.guide03",
  "dexo.personalityCurious",
  "dexo.personalityFocused",
  "dexo.personalityHappy",
  "dexo.personalityVictory",
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();
  const onboarding = useOnboardingStore();
  const [assetsReady, setAssetsReady] = useState(false);
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });

  const firstName = adapter.getUser()?.first_name ?? bootstrap.data?.player.firstName ?? "Explorer";
  const stepIndex = onboardingStepOrder.indexOf(onboarding.step);
  const currentGuide = guideScenes[onboarding.guideIndex];
  const sceneContent = onboarding.step === "guide" ? currentGuide : stepContent[onboarding.step];

  useEffect(() => {
    if (onboarding.status === "not-started") onboarding.start();
  }, [onboarding]);

  useEffect(() => {
    let active = true;
    void preloadAssets(onboardingAssets).then(() => {
      if (active) setAssetsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    adapter.disableVerticalSwipes();
    const goBack = () => {
      if (onboarding.step === "welcome") void navigate({ to: "/" });
      else onboarding.previous();
    };
    const hideBackButton = adapter.showBackButton(goBack);
    return () => {
      hideBackButton();
      adapter.enableVerticalSwipes();
    };
  }, [adapter, navigate, onboarding]);

  useEffect(() => {
    if (onboarding.step === "acquired") {
      onboarding.markAcquired();
      adapter.hapticNotice("success");
    }
  }, [adapter, onboarding.step]);

  const progress = useMemo(() => ((stepIndex + 1) / onboardingStepOrder.length) * 100, [stepIndex]);

  if (bootstrap.isPending || !assetsReady) return <AppLoader />;

  const handleNext = () => {
    adapter.hapticImpact("light");
    if (onboarding.step === "guide") {
      if (onboarding.guideIndex < guideScenes.length - 1) {
        onboarding.setGuideIndex(onboarding.guideIndex + 1);
        return;
      }
      onboarding.next();
      return;
    }
    if (onboarding.step === "ready") {
      onboarding.complete();
      adapter.hapticNotice("success");
      void navigate({ to: "/base" });
      return;
    }
    onboarding.next();
  };

  const handlePrevious = () => {
    adapter.hapticImpact("soft");
    if (onboarding.step === "welcome") void navigate({ to: "/" });
    else onboarding.previous();
  };

  return (
    <motion.main
      className={styles.stage}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: .62, ease: "easeOut" }}
    >
      <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
      <div className={styles.scrim} aria-hidden="true" />

      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={handlePrevious} aria-label="Previous step">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.8} />
        </button>
        <div className={styles.progressTrack} aria-label={`Onboarding ${Math.round(progress)} percent complete`}>
          <motion.i animate={{ width: `${progress}%` }} transition={{ duration: .45 }} />
        </div>
        <span className={styles.stepCount}>{String(stepIndex + 1).padStart(2, "0")}/{String(onboardingStepOrder.length).padStart(2, "0")}</span>
      </header>

      <section className={styles.scene}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${onboarding.step}-${onboarding.guideIndex}`}
            className={styles.sceneInner}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: .46, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.copy}>
              <span className={styles.eyebrow}>
                {onboarding.step === "welcome" ? `WELCOME, ${firstName.toUpperCase()}` : sceneContent.eyebrow}
              </span>
              <h1>{sceneContent.title}</h1>
              <p>{sceneContent.body}</p>
            </div>

            <DexoStage
              character={sceneContent.asset}
              effect={onboarding.step === "meet" ? "reveal" : onboarding.step === "acquired" ? "acquired" : "idle"}
              characterScale={sceneContent.scale}
              showParticles={onboarding.step === "acquired"}
              className={styles.dexoStage}
            />
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className={styles.footer}>
        {onboarding.step === "guide" ? (
          <div className={styles.guideDots} aria-label={`Guide step ${onboarding.guideIndex + 1} of ${guideScenes.length}`}>
            {guideScenes.map((scene, index) => (
              <button
                type="button"
                key={scene.eyebrow}
                className={index === onboarding.guideIndex ? styles.activeDot : ""}
                onClick={() => {
                  onboarding.setGuideIndex(index);
                  adapter.selectionChanged();
                }}
                aria-label={`Open ${scene.eyebrow}`}
              />
            ))}
          </div>
        ) : null}
        <Button
          size="lg"
          className={styles.nextButton}
          trailingIcon={
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              size={19}
              strokeWidth={1.9}
            />
          }
          onClick={handleNext}
        >
          {onboarding.step === "welcome" ? "Begin" : onboarding.step === "ready" ? "Enter Base" : "Continue"}
        </Button>
      </footer>
    </motion.main>
  );
}
