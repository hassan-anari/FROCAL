import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { AssetImage } from "@/design-system/components/AssetImage";
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

const reactions: AssetKey[] = [
  "dexo.base",
  "dexo.personalityCurious",
  "dexo.personalityHappy",
  "dexo.personalityFocused",
];

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
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (onboarding.status !== "completed") void navigate({ to: "/onboarding" });
  }, [navigate, onboarding.status]);

  useEffect(() => {
    adapter.disableVerticalSwipes();
    return () => adapter.enableVerticalSwipes();
  }, [adapter]);

  const player = bootstrap.data?.player;
  const firstName = adapter.getUser()?.first_name ?? player?.firstName ?? "Explorer";
  const initials = firstName.trim().slice(0, 1).toUpperCase();
  const xpPercent = useMemo(() => {
    if (!player) return 0;
    return Math.min(100, Math.round((player.xp / player.xpToNextLevel) * 100));
  }, [player]);

  if (bootstrap.isPending || !player) return <AppLoader />;

  const reactToPlayer = () => {
    setReactionIndex((value) => (value + 1) % reactions.length);
    adapter.hapticImpact("soft");
  };

  const sayHello = () => {
    setReactionIndex(2);
    setSynced(true);
    adapter.hapticNotice("success");
  };

  return (
    <main className={styles.stage}>
      <AssetImage assetKey="world.foundationBackdrop" className={styles.backdrop} />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.baseGlow} aria-hidden="true" />
      <div className={styles.scanline} aria-hidden="true" />

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
          character={reactions[reactionIndex]}
          effect="base"
          interactive
          onPress={reactToPlayer}
          ariaLabel="Interact with Dexo"
          className={styles.dexoStage}
        />
        <AnimatePresence mode="wait">
          <motion.div
            key={synced ? "synced" : reactionIndex}
            className={styles.reaction}
            initial={{ opacity: 0, y: 6, scale: .96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <i aria-hidden="true" />
            {synced ? "Dexo is happy to see you." : "Tap Dexo to interact"}
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
          className={`${styles.actionButton} ${synced ? styles.actionComplete : ""}`}
          trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={19} strokeWidth={1.9} />}
          onClick={sayHello}
        >
          {synced ? "Connection synced" : "Say hello to Dexo"}
        </Button>
      </section>
    </main>
  );
}
