import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { AppLoader } from "@/design-system/components/AppLoader";
import { DexoStage } from "@/design-system/components/DexoStage";
import { Button } from "@/design-system/primitives/Button";
import { useOnboardingStore } from "@/game/onboarding/onboardingStore";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import type { AssetKey } from "@/assets/registry";
import styles from "./BasePage.module.css";

const reactions: Array<{ asset: AssetKey; scale: number; message: string }> = [
  { asset: "dexo.base", scale: .9, message: "Tap Dexo to interact" },
  { asset: "dexo.personalityCurious", scale: .87, message: "Dexo is curious about your next move." },
  { asset: "dexo.personalityHappy", scale: .82, message: "Dexo is happy to see you." },
  { asset: "dexo.personalityFocused", scale: .86, message: "Dexo is ready for the journey ahead." },
];

const baseAssets = [
  "dexo.platform",
  "dexo.base",
  "dexo.personalityCurious",
  "dexo.personalityHappy",
  "dexo.personalityFocused",
] as const;

export function BasePage() {
  const navigate = useNavigate();
  const scenario = useScenarioStore((state) => state.activeScenario);
  const onboarding = useOnboardingStore();
  const { adapter } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });
  const [reactionIndex, setReactionIndex] = useState(0);
  const [greeted, setGreeted] = useState(false);

  useEffect(() => {
    if (onboarding.status !== "completed") void navigate({ to: "/onboarding" });
  }, [navigate, onboarding.status]);

  useEffect(() => {
    adapter.disableVerticalSwipes();
    return () => adapter.enableVerticalSwipes();
  }, [adapter]);

  useEffect(() => {
    void preloadAssets(baseAssets);
  }, []);

  const player = bootstrap.data?.player;
  const firstName = adapter.getUser()?.first_name ?? player?.firstName ?? "Explorer";
  const initials = firstName.trim().slice(0, 1).toUpperCase();
  const xpPercent = useMemo(() => {
    if (!player) return 0;
    return Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100));
  }, [player]);

  if (bootstrap.isPending || !player) return <AppLoader />;

  const currentReaction = reactions[reactionIndex];

  const reactToPlayer = () => {
    setGreeted(false);
    setReactionIndex((value) => (value + 1) % reactions.length);
    adapter.hapticImpact("soft");
  };

  const sayHello = () => {
    setReactionIndex(2);
    setGreeted(true);
    adapter.hapticNotice("success");
  };

  return (
    <main className={styles.stage}>
      <div className={styles.ambientBackdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.playerIdentity}>
          {adapter.getUser()?.photo_url ? (
            <img src={adapter.getUser()?.photo_url} alt="" className={styles.avatar} />
          ) : (
            <span className={styles.avatarFallback}>{initials}</span>
          )}
          <div>
            <span>Welcome back</span>
            <strong>{firstName}</strong>
          </div>
        </div>
        <div className={styles.seasonPill}>
          <i />
          Season One
        </div>
      </header>

      <section className={styles.world}>
        <div className={styles.worldLabel}>
          <span>PERSONAL BASE</span>
          <strong>DEXO ONLINE</strong>
        </div>
        <DexoStage
          character={currentReaction.asset}
          characterScale={currentReaction.scale}
          effect="base"
          showParticles={false}
          interactive
          onPress={reactToPlayer}
          ariaLabel="Interact with Dexo"
          className={styles.dexoStage}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={`${greeted}-${reactionIndex}`}
            className={styles.reaction}
            initial={{ opacity: 0, y: 6, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: .28 }}
          >
            <i aria-hidden="true" />
            {greeted ? "Dexo is happy to see you." : currentReaction.message}
          </motion.div>
        </AnimatePresence>
      </section>

      <section className={styles.hud} aria-label="Player progression">
        <div className={styles.hudHeader}>
          <div>
            <span>YOUR DEXO</span>
            <strong>Newborn Companion</strong>
          </div>
          <div className={styles.levelBadge}>
            <span>LV.</span>
            <strong>{player.level}</strong>
          </div>
        </div>

        <div className={styles.xpRow}>
          <div className={styles.xpLabels}>
            <span>Growth progress</span>
            <strong>{player.xp} / {player.xpToNextLevel} XP</strong>
          </div>
          <div className={styles.xpTrack}>
            <motion.i initial={{ width: 0 }} animate={{ width: `${xpPercent}%` }} transition={{ duration: .9, delay: .18 }} />
          </div>
        </div>

        <Button
          size="lg"
          className={styles.actionButton}
          trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={19} strokeWidth={1.9} />}
          onClick={sayHello}
        >
          {greeted ? "Say hello again" : "Say hello to Dexo"}
        </Button>
      </section>
    </main>
  );
}
