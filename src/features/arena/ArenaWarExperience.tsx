import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ChampionIcon,
  InformationCircleIcon,
  Sword01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, type CSSProperties, type ReactNode } from "react";
import { preloadAssets } from "@/assets/preload";
import type { AssetKey } from "@/assets/registry";
import { AssetImage } from "@/design-system/components/AssetImage";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { clanShopItems, getClanById } from "@/game/clan/clanCatalog";
import type { ClanSummary } from "@/game/clan/types";
import { getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import { arenaWarDebugPreloadAssets, warFlow, warResults, warStatuses } from "@/game/arena/arenaCatalog";
import { useArenaWarStore } from "@/game/arena/arenaStore";
import type { ArenaWarResultMeta, ArenaWarStatusMeta } from "@/game/arena/types";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ArenaWarExperience.module.css";

function WarClanMark({ clan }: { clan: ClanSummary }) {
  const hue = getIdentityHue(clan.name);
  return (
    <div className={styles.clanMark} style={{ "--identity-hue": hue } as CSSProperties}>
      <span>{clan.imageUrl ? <img src={clan.imageUrl} alt="" /> : getIdentityInitials(clan.name)}</span>
      <AssetImage assetKey="clan.emblemCrest" className={styles.clanFrame} />
    </div>
  );
}

function WarHeader({ ownClan, rival }: { ownClan: ClanSummary; rival: ClanSummary }) {
  return (
    <section className={styles.matchHeader}>
      <div><WarClanMark clan={ownClan} /><strong>{ownClan.name}</strong><span>#{ownClan.rank}</span></div>
      <em>VS</em>
      <div><WarClanMark clan={rival} /><strong>{rival.name}</strong><span>#{rival.rank}</span></div>
    </section>
  );
}

function HeroScene({ asset, eyebrow, title, copy, children }: { asset: AssetKey; eyebrow: string; title: string; copy: string; children?: ReactNode }) {
  return (
    <section className={styles.stageHero}>
      <div className={styles.stageArtWrap}><AssetImage assetKey={asset} className={styles.stageArt} /><div className={styles.stageShade} /></div>
      <div className={styles.stageCopy}><span>{eyebrow}</span><h2>{title}</h2><p>{copy}</p>{children}</div>
    </section>
  );
}

function ActionBar({ back, next, nextLabel, disabled = false }: { back?: () => void; next: () => void; nextLabel: string; disabled?: boolean }) {
  return (
    <div className={styles.actionBar}>
      {back ? <button type="button" className={styles.secondaryAction} onClick={back}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.7} /> Back</button> : <span />}
      <button type="button" className={styles.primaryAction} onClick={next} disabled={disabled}>{nextLabel} <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} /></button>
    </div>
  );
}

function MatchmakingStage({ next }: { next: () => void }) {
  return (
    <>
      <HeroScene asset="war.matchmaking" eyebrow="WARFRONT · MATCHMAKING" title="Searching the seasonal war pool." copy="Arena compares active clans by season tier, activity and readiness before presenting a rival.">
        <div className={styles.searchSignal}><i /><span>SCANNING ACTIVE CLANS</span></div>
      </HeroScene>
      <section className={styles.infoPanel}><HugeiconsIcon icon={InformationCircleIcon} size={19} strokeWidth={1.55} /><div><strong>No resources are committed yet.</strong><p>Matchmaking only finds a compatible opponent. Preparation begins after the clan accepts the match.</p></div></section>
      <ActionBar next={next} nextLabel="Find opponent" />
    </>
  );
}

function OpponentStage({ ownClan, rival, next, back }: { ownClan: ClanSummary; rival: ClanSummary; next: () => void; back: () => void }) {
  return (
    <>
      <HeroScene asset="war.opponent" eyebrow="OPPONENT FOUND" title={`${rival.name} entered the arena.`} copy="A rival has been locked for review. Check the matchup before committing the clan to preparation." />
      <WarHeader ownClan={ownClan} rival={rival} />
      <ActionBar back={back} next={next} nextLabel="Review opponent" />
    </>
  );
}

function PreviewStage({ ownClan, rival, next, back }: { ownClan: ClanSummary; rival: ClanSummary; next: () => void; back: () => void }) {
  const delta = ownClan.score - rival.score;
  return (
    <>
      <HeroScene asset="war.opponentPreview" eyebrow="OPPONENT PREVIEW" title="Know the rival before you commit." copy="Season score gives context, but coordination and the final loadout can still change the outcome." />
      <WarHeader ownClan={ownClan} rival={rival} />
      <section className={styles.compareGrid}>
        <article><span>SEASON SCORE</span><strong>{ownClan.score.toLocaleString()}</strong><em>{rival.score.toLocaleString()} rival</em></article>
        <article><span>ACTIVE ROSTER</span><strong>{ownClan.members}/{ownClan.capacity}</strong><em>{rival.members}/{rival.capacity} rival</em></article>
        <article><span>POWER GAP</span><strong className={delta >= 0 ? styles.positive : styles.negative}>{delta >= 0 ? "+" : ""}{delta.toLocaleString()}</strong><em>score context</em></article>
      </section>
      <section className={styles.formPanel}><span>RECENT FORM</span><div className={styles.formDots}><i className={styles.win}>W</i><i className={styles.win}>W</i><i className={styles.loss}>L</i><i className={styles.win}>W</i><i className={styles.draw}>D</i></div><p>Recent form is context only. War progress is resolved from verified member activity.</p></section>
      <ActionBar back={back} next={next} nextLabel="Continue" />
    </>
  );
}

function ConfirmStage({ ownClan, rival, next, back }: { ownClan: ClanSummary; rival: ClanSummary; next: () => void; back: () => void }) {
  return (
    <>
      <HeroScene asset="war.confirmation" eyebrow="MATCH CONFIRMATION" title="Commit the clan to this war?" copy="Once confirmed, the matchup moves into Preparation and the shared loadout can be locked." />
      <WarHeader ownClan={ownClan} rival={rival} />
      <section className={styles.confirmList}>
        <div><span>War window</span><strong>30 minutes</strong></div>
        <div><span>Loadout slots</span><strong>2 shared items</strong></div>
        <div><span>Season impact</span><strong>Win / Draw / Loss</strong></div>
      </section>
      <ActionBar back={back} next={next} nextLabel="Confirm war" />
    </>
  );
}

function PrepareStage({ next, back }: { next: () => void; back: () => void }) {
  return (
    <>
      <HeroScene asset="war.preparation" eyebrow="PREPARATION PHASE" title="One clan plan before the countdown." copy="Members can review the opponent while the Captain locks the shared battle setup." />
      <section className={styles.readinessPanel}>
        <div className={styles.readinessTop}><span>CLAN READINESS</span><strong>18 / 24 ready</strong></div>
        <div className={styles.readinessTrack}><i style={{ transform: "scaleX(.75)" }} /></div>
        <div className={styles.readinessMeta}><span>Captain online</span><span>6 members pending</span><span>Loadout open</span></div>
      </section>
      <section className={styles.phaseSteps}><article><b>01</b><div><strong>Review</strong><span>Opponent and current form</span></div></article><article><b>02</b><div><strong>Equip</strong><span>Select up to two shared items</span></div></article><article><b>03</b><div><strong>Lock</strong><span>Freeze setup before countdown</span></div></article></section>
      <ActionBar back={back} next={next} nextLabel="Choose loadout" />
    </>
  );
}

function ItemsStage({ next, back }: { next: () => void; back: () => void }) {
  const selected = useArenaWarStore((state) => state.selectedItemIds);
  const toggleItem = useArenaWarStore((state) => state.toggleItem);
  const eligible = clanShopItems.filter((item) => ["coordination-booster", "contribution-booster", "fortification-grid", "protection-dome"].includes(item.id));
  return (
    <>
      <HeroScene asset="war.itemSelection" eyebrow="SHARED LOADOUT" title="Choose up to two war items." copy="The Captain locks the clan loadout. Items shown here are mock inventory for frontend testing." />
      <div className={styles.itemSelectGrid}>
        {eligible.map((item) => {
          const active = selected.includes(item.id);
          return <button type="button" key={item.id} className={active ? styles.itemSelected : ""} onClick={() => toggleItem(item.id)}><AssetImage assetKey={item.artKey} /><div><span>{item.kind}</span><strong>{item.name}</strong><p>{item.effect}</p></div><em>{active ? "SELECTED" : "SELECT"}</em></button>;
        })}
      </div>
      <div className={styles.selectionNote}><span>{selected.length}/2 selected</span><strong>{selected.length === 0 ? "You can enter without an item in this prototype." : "Loadout ready to lock."}</strong></div>
      <ActionBar back={back} next={next} nextLabel="Lock loadout" />
    </>
  );
}

function CountdownStage({ next, back }: { next: () => void; back: () => void }) {
  return (
    <>
      <HeroScene asset="war.countdown" eyebrow="BATTLE SYNCHRONIZATION" title="The setup is locked." copy="The countdown gives every member one clear signal before verified activity starts moving the war." />
      <section className={styles.countdownPanel}><span>BATTLE STARTS IN</span><strong>00:10</strong><div><i /><i /><i /><i /><i /></div><p>Loadout locked · Match confirmed · War channel ready</p></section>
      <ActionBar back={back} next={next} nextLabel="Start battle" />
    </>
  );
}

function BattleStage({ ownClan, rival, next, back, final = false }: { ownClan: ClanSummary; rival: ClanSummary; next: () => void; back: () => void; final?: boolean }) {
  const ours = useArenaWarStore((state) => state.battleProgress);
  const enemy = useArenaWarStore((state) => state.enemyProgress);
  return (
    <>
      <HeroScene asset={final ? "war.finalMoments" : "war.active"} eyebrow={final ? "FINAL MOMENTS" : "LIVE WAR"} title={final ? "Every verified action still counts." : "The battlefield is moving."} copy={final ? "The closing window is almost over. Final contributions can still change the result." : "Member activity is resolving into shared clan progress in real time."} />
      <WarHeader ownClan={ownClan} rival={rival} />
      <section className={`${styles.battleBoard} ${final ? styles.battleFinal : ""}`}>
        <div><span>{ownClan.tag}</span><strong>{ours}%</strong><div><i style={{ transform: `scaleX(${ours / 100})` }} /></div></div>
        <em>{final ? "00:38" : "18:42"}</em>
        <div><span>{rival.tag}</span><strong>{enemy}%</strong><div><i style={{ transform: `scaleX(${enemy / 100})` }} /></div></div>
      </section>
      <section className={styles.liveFeed}><article><span>NOW</span><strong>+3.2%</strong><p>Five verified clan actions landed together.</p></article><article><span>42s</span><strong>Rival surge</strong><p>{rival.name} added a coordinated contribution burst.</p></article><article><span>1m</span><strong>Loadout effect</strong><p>Coordination window is influencing eligible activity.</p></article></section>
      <ActionBar back={back} next={next} nextLabel={final ? "Seal result" : "Enter final moments"} />
    </>
  );
}

function ResultStage({ meta, next, back }: { meta: ArenaWarResultMeta; next: () => void; back: () => void }) {
  return (
    <>
      <section className={styles.resultHero}>
        <AssetImage assetKey={meta.asset} className={styles.resultArt} />
        <div className={styles.resultCopy}><span>WAR RESULT</span><h2>{meta.title}</h2><p>{meta.subtitle}</p></div>
      </section>
      <section className={styles.resultRewards}>
        <article><HugeiconsIcon icon={ChampionIcon} size={20} strokeWidth={1.55} /><div><span>SEASON SCORE</span><strong className={meta.scoreDelta >= 0 ? styles.positive : styles.negative}>{meta.scoreDelta >= 0 ? "+" : ""}{meta.scoreDelta}</strong></div></article>
        <article><HugeiconsIcon icon={Wallet01Icon} size={20} strokeWidth={1.55} /><div><span>TREASURY REWARD</span><strong>+{meta.reward.toLocaleString()}</strong></div></article>
      </section>
      <ActionBar back={back} next={next} nextLabel="Set defence" />
    </>
  );
}

function DefenceStage({ next, back }: { next: () => void; back: () => void }) {
  const defenceItems = clanShopItems.filter((item) => item.kind === "Defence");
  const selected = useArenaWarStore((state) => state.selectedItemIds);
  const toggleItem = useArenaWarStore((state) => state.toggleItem);
  return (
    <>
      <HeroScene asset="war.defenceSetup" eyebrow="HEADQUARTERS DEFENCE" title="Prepare for the next incoming attack." copy="Defence is simple: choose protection, then the HQ enters a clear post-war state." />
      <div className={styles.defenceGrid}>
        {defenceItems.map((item) => {
          const active = selected.includes(item.id);
          return <button type="button" key={item.id} className={active ? styles.itemSelected : ""} onClick={() => toggleItem(item.id)}><AssetImage assetKey={item.artKey} /><div><strong>{item.name}</strong><span>{item.rarity} defence</span></div><em>{active ? "ARMED" : "ARM"}</em></button>;
        })}
      </div>
      <section className={styles.infoPanel}><HugeiconsIcon icon={Sword01Icon} size={19} strokeWidth={1.55} /><div><strong>Defence does not create another complex battle screen.</strong><p>It modifies protection, recovery and post-war conditions around the headquarters.</p></div></section>
      <ActionBar back={back} next={next} nextLabel="Apply defence" />
    </>
  );
}

function StatusStage({ meta, onReset, back }: { meta: ArenaWarStatusMeta; onReset: () => void; back: () => void }) {
  return (
    <>
      <section className={styles.statusHero}>
        <AssetImage assetKey={meta.asset} className={styles.statusArt} />
        <div><span>POST-WAR STATUS</span><h2>{meta.title}</h2><p>{meta.subtitle}</p><strong>{meta.durationLabel}</strong></div>
      </section>
      <section className={styles.statusSummary}><article><span>WAR SYSTEM</span><strong>Cooldown active</strong></article><article><span>CLAN HQ</span><strong>State synchronized</strong></article><article><span>NEXT ACTION</span><strong>{meta.id === "reward" ? "Claim reward" : "Wait for status end"}</strong></article></section>
      <div className={styles.actionBar}><button type="button" className={styles.secondaryAction} onClick={back}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.7} /> Back</button><button type="button" className={styles.primaryAction} onClick={onReset}>Restart war lab <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} /></button></div>
    </>
  );
}

export function ArenaWarExperience({ ownClan }: { ownClan: ClanSummary | null }) {
  const { adapter } = useTelegram();
  const stage = useArenaWarStore((state) => state.stage);
  const result = useArenaWarStore((state) => state.result);
  const status = useArenaWarStore((state) => state.status);
  const nextStage = useArenaWarStore((state) => state.nextStage);
  const previousStage = useArenaWarStore((state) => state.previousStage);
  const resetWar = useArenaWarStore((state) => state.resetWar);

  useEffect(() => { void preloadAssets(arenaWarDebugPreloadAssets); }, []);

  const homeClan = ownClan ?? getClanById("nova-vanguard")!;
  const rival = useMemo(() => {
    const preferred = homeClan.id === "void-runners" ? "ember-grid" : "void-runners";
    return getClanById(preferred) ?? getClanById("ember-grid")!;
  }, [homeClan.id]);
  const resultMeta = warResults.find((entry) => entry.id === result) ?? warResults[0];
  const statusMeta = warStatuses.find((entry) => entry.id === status) ?? warStatuses[0];
  const stageMeta = warFlow.find((entry) => entry.id === stage);

  useEffect(() => {
    if (stageMeta) void preloadAssets([stageMeta.asset]);
    if (stage === "result") void preloadAssets([resultMeta.asset]);
    if (stage === "status") void preloadAssets([statusMeta.asset]);
  }, [resultMeta.asset, stage, stageMeta, statusMeta.asset]);

  const next = () => { adapter.selectionChanged(); nextStage(); };
  const back = () => { adapter.hapticImpact("light"); previousStage(); };

  return (
    <div className={styles.root}>
      <div className={styles.labBanner}><span>SEASON 2 WAR LAB</span><strong>Debug simulation · frontend only</strong></div>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div key={stage} className={styles.stageStack} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={mobileMotion.tab}>
          {stage === "matchmaking" ? <MatchmakingStage next={next} /> : null}
          {stage === "opponent" ? <OpponentStage ownClan={homeClan} rival={rival} next={next} back={back} /> : null}
          {stage === "preview" ? <PreviewStage ownClan={homeClan} rival={rival} next={next} back={back} /> : null}
          {stage === "confirm" ? <ConfirmStage ownClan={homeClan} rival={rival} next={next} back={back} /> : null}
          {stage === "prepare" ? <PrepareStage next={next} back={back} /> : null}
          {stage === "items" ? <ItemsStage next={next} back={back} /> : null}
          {stage === "countdown" ? <CountdownStage next={next} back={back} /> : null}
          {stage === "battle" ? <BattleStage ownClan={homeClan} rival={rival} next={next} back={back} /> : null}
          {stage === "final" ? <BattleStage ownClan={homeClan} rival={rival} next={next} back={back} final /> : null}
          {stage === "result" ? <ResultStage meta={resultMeta} next={next} back={back} /> : null}
          {stage === "defence" ? <DefenceStage next={next} back={back} /> : null}
          {stage === "status" ? <StatusStage meta={statusMeta} onReset={() => { adapter.hapticNotice("success"); resetWar(); }} back={back} /> : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
