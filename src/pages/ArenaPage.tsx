import {
  ArrowRight01Icon,
  ChampionIcon,
  InformationCircleIcon,
  Sword01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { preloadAssets } from "@/assets/preload";
import { AssetImage } from "@/design-system/components/AssetImage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import {
  arenaHistoryPreloadAssets,
  arenaOverviewPreloadAssets,
  arenaPlayerRanking,
  arenaRankingPreloadAssets,
  arenaSeason,
  arenaWarHistory,
  arenaWarPreloadAssets,
  attackClanTasks,
  attackPersonalTasks,
  defenceClanTasks,
  defencePersonalTasks,
  warResults,
  warStatuses,
} from "@/game/arena/arenaCatalog";
import { useArenaWarStore } from "@/game/arena/arenaStore";
import type {
  ArenaHubSection,
  ArenaPlayerRank,
  ArenaRankingMode,
  ArenaWarHistoryEntry,
  ArenaWarTask,
} from "@/game/arena/types";
import { clanCatalog, clanShopItems, getClanById } from "@/game/clan/clanCatalog";
import { useClanStore } from "@/game/clan/clanStore";
import type { ClanInventoryItem, ClanSummary, CreatedClan } from "@/game/clan/types";
import { getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import { useEarnStore } from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ArenaPage.module.css";

function buildCreatedClanSummary(created: CreatedClan): ClanSummary {
  return {
    id: "captain-created",
    name: created.name,
    tag: created.tag,
    level: 3,
    members: 8,
    capacity: 24,
    rank: 22,
    score: 24_860,
    status: "Recruiting",
    summary: created.motto,
    accent: created.accent,
    imageUrl: created.telegramGroupPhotoUrl ?? null,
  };
}

function ClanMark({ clan, large = false }: { clan: ClanSummary; large?: boolean }) {
  const hue = getIdentityHue(clan.name);
  return (
    <div className={`${styles.clanMark} ${large ? styles.clanMarkLarge : ""}`} style={{ "--identity-hue": hue } as CSSProperties}>
      <span>{clan.imageUrl ? <img src={clan.imageUrl} alt="" /> : getIdentityInitials(clan.name)}</span>
      <AssetImage assetKey="clan.emblemCrest" className={styles.clanMarkFrame} />
    </div>
  );
}

function PlayerAvatar({ player, large = false }: { player: ArenaPlayerRank; large?: boolean }) {
  return (
    <div className={`${styles.playerAvatar} ${large ? styles.playerAvatarLarge : ""}`} style={{ "--identity-hue": player.accentHue } as CSSProperties}>
      <span>{player.initials}</span>
      <AssetImage assetKey="profile.frame.standard" className={styles.playerFrame} />
    </div>
  );
}

function CurrentPlayerAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "D";
  return <div className={styles.currentPlayerAvatar}>{photoUrl ? <img src={photoUrl} alt="" /> : <span>{initial}</span>}</div>;
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <header className={styles.sectionTitle}><div><span>{eyebrow}</span><h2>{title}</h2></div>{action}</header>;
}

function ProgressBar({ value, enemy = false }: { value: number; enemy?: boolean }) {
  return <div className={`${styles.progressTrack} ${enemy ? styles.enemyTrack : ""}`}><i style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} /></div>;
}

function BattleIdentity({ ownClan, rival, direction, ownProgress, enemyProgress }: { ownClan: ClanSummary; rival: ClanSummary; direction: "attack" | "defence"; ownProgress: number; enemyProgress: number }) {
  return (
    <section className={styles.battleIdentity}>
      <div className={styles.battleClan}><ClanMark clan={ownClan} /><div><span>YOUR CLAN</span><strong>{ownClan.name}</strong><em>{ownProgress}% complete</em></div></div>
      <div className={styles.battleVs}><span>{direction === "attack" ? "ATTACKING" : "DEFENDING"}</span><strong>VS</strong><em>03:18:42</em></div>
      <div className={`${styles.battleClan} ${styles.battleClanEnemy}`}><div><span>RIVAL</span><strong>{rival.name}</strong><em>{enemyProgress}% complete</em></div><ClanMark clan={rival} /></div>
      <div className={styles.battleProgressGrid}>
        <div><span>{ownClan.tag}</span><strong>{ownProgress}%</strong><ProgressBar value={ownProgress} /></div>
        <div><span>{rival.tag}</span><strong>{enemyProgress}%</strong><ProgressBar value={enemyProgress} enemy /></div>
      </div>
    </section>
  );
}

function TaskCard({ task }: { task: ArenaWarTask }) {
  const ratio = Math.min(1, task.current / Math.max(1, task.target));
  const completed = task.completed ?? ratio >= 1;
  return (
    <article className={`${styles.warTask} ${completed ? styles.warTaskDone : ""}`}>
      <div className={styles.taskPercent}><strong>{Math.round(ratio * 100)}%</strong><span>{completed ? "DONE" : "+" + task.warPoints + " WP"}</span></div>
      <div className={styles.taskCopy}>
        <div><span>{task.scope === "personal" ? "YOUR ORDER" : "CLAN OPERATION"}</span><em>{task.current.toLocaleString()} / {task.target.toLocaleString()} {task.unit}</em></div>
        <strong>{task.title}</strong>
        <p>{task.description}</p>
        <ProgressBar value={ratio * 100} />
      </div>
    </article>
  );
}

function ArenaOverview({
  captain,
  ownClan,
  rival,
  scenario,
  ownProgress,
  enemyProgress,
  onOpenWar,
  onFindTarget,
  onOpenHistory,
}: {
  captain: boolean;
  ownClan: ClanSummary | null;
  rival: ClanSummary;
  scenario: string;
  ownProgress: number;
  enemyProgress: number;
  onOpenWar: () => void;
  onFindTarget: () => void;
  onOpenHistory: () => void;
}) {
  const active = scenario === "attacking" || scenario === "defending";
  const defending = scenario === "defending";
  return (
    <div className={styles.stack}>
      <section className={`${styles.overviewHero} ${active ? styles.overviewHeroLive : ""}`}>
        <AssetImage assetKey={active ? "war.active" : "war.opponentPreview"} className={styles.overviewHeroArt} />
        <div className={styles.overviewShade} />
        <div className={styles.overviewHeroCopy}>
          <span>{active ? (defending ? "HEADQUARTERS UNDER ATTACK" : "ATTACK IN PROGRESS") : captain ? "WAR COMMAND ONLINE" : "WARFRONT STATUS"}</span>
          <h2>{active ? `${ownClan?.name ?? "Your Clan"} vs ${rival.name}` : captain ? "Choose when your clan goes to war." : "Your orders begin when the clan enters war."}</h2>
          <p>{active ? "Complete war operations before the rival does. Total completion wins; speed breaks a tie." : captain ? "Search the Arena, inspect a rival and launch a task-based clan operation when your team is ready." : "The Captain controls challenges and defence. When a war starts, this page becomes your live mission board."}</p>
          <button type="button" className={styles.heroAction} onClick={active ? onOpenWar : captain ? onFindTarget : onOpenWar}>
            {active ? "Open live war" : captain ? "Find a rival" : "Open war status"} <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
          </button>
        </div>
        {active ? <div className={styles.overviewScore}><span>{ownProgress}%</span><i /><span>{enemyProgress}%</span></div> : null}
      </section>

      {ownClan ? (
        <section className={styles.roleStrip}>
          <div><span>{captain ? "CAPTAIN CONTROL" : "SOLDIER ACCESS"}</span><strong>{captain ? "Challenge, prepare and defend." : "Track the war and complete your orders."}</strong></div>
          <ClanMark clan={ownClan} />
        </section>
      ) : (
        <section className={styles.noClanGate}><HugeiconsIcon icon={UserGroupIcon} size={22} strokeWidth={1.55} /><div><strong>Clan required for Warfront</strong><p>Join or found a clan first. Individual Rankings remain available.</p></div></section>
      )}

      <section className={styles.commandGrid}>
        {captain ? (
          <button type="button" onClick={onFindTarget}>
            <AssetImage assetKey="war.opponentPreview" />
            <div><span>CAPTAIN ACTION</span><strong>Find Target</strong><p>Search or browse clans near your competitive tier.</p></div>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
          </button>
        ) : (
          <div className={styles.commandStatic}>
            <HugeiconsIcon icon={Sword01Icon} size={22} strokeWidth={1.5} />
            <div><span>YOUR ROLE</span><strong>Complete orders</strong><p>Your verified actions push the shared war score.</p></div>
          </div>
        )}
        <button type="button" onClick={onOpenHistory}>
          <AssetImage assetKey="war.victory" />
          <div><span>WAR RECORD</span><strong>History</strong><p>Review results, task completion and clan rewards.</p></div>
          <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
        </button>
      </section>

      {captain ? (
        <section className={styles.defenceCard}>
          <div className={styles.defenceArt}><AssetImage assetKey="war.defenceSetup" /></div>
          <div><span>HEADQUARTERS DEFENCE</span><strong>Defence is a Captain decision.</strong><p>Defensive items and post-war protection are locked before an incoming operation. Soldiers only see the active state and their orders.</p></div>
        </section>
      ) : null}
    </div>
  );
}

function TargetCard({ clan, ownClan, onInspect }: { clan: ClanSummary; ownClan: ClanSummary; onInspect: () => void }) {
  const levelGap = Math.abs(clan.level - ownClan.level);
  const rankGap = Math.abs(clan.rank - ownClan.rank);
  const fit = Math.max(72, 98 - levelGap * 5 - Math.min(16, rankGap));
  const protectedClan = clan.id === "ion-citadel";
  return (
    <button type="button" className={styles.targetCard} onClick={onInspect} disabled={protectedClan}>
      <ClanMark clan={clan} />
      <div className={styles.targetCopy}>
        <div><strong>{clan.name}</strong>{protectedClan ? <em>PROTECTED</em> : <em>{fit}% TIER FIT</em>}</div>
        <span>HQ LVL {clan.level} · Rank #{clan.rank} · {clan.members}/{clan.capacity} members</span>
        <p>{8 + (clan.rank % 4)}W · {2 + (clan.level % 4)}L recent war record</p>
      </div>
      <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.65} />
    </button>
  );
}

function TargetBrowser({ ownClan, onInspect }: { ownClan: ClanSummary; onInspect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const candidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const available = clanCatalog.filter((entry) => entry.id !== ownClan.id);
    if (normalized) return available.filter((entry) => entry.name.toLowerCase().includes(normalized) || entry.tag.toLowerCase().includes(normalized));
    return [...available].sort((a, b) => {
      const aScore = Math.abs(a.level - ownClan.level) * 5 + Math.abs(a.rank - ownClan.rank);
      const bScore = Math.abs(b.level - ownClan.level) * 5 + Math.abs(b.rank - ownClan.rank);
      return aScore - bScore;
    }).slice(0, 6);
  }, [ownClan.id, ownClan.level, ownClan.rank, query]);

  return (
    <div className={styles.stack}>
      <section className={styles.targetHero}>
        <AssetImage assetKey="war.opponentPreview" />
        <div><span>CAPTAIN · TARGET COMMAND</span><h2>Choose the rival yourself.</h2><p>Recommended clans stay near your level and ranking, but the Captain can search the network by clan name or tag.</p></div>
      </section>
      <section className={styles.panel}>
        <SectionTitle eyebrow={query ? "SEARCH RESULTS" : "RECOMMENDED RIVALS"} title={query ? "Clan search" : "Near your competitive tier"} action={<span className={styles.hint}>{candidates.length} available</span>} />
        <label className={styles.searchBox}><span>Clan name or tag</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nova, NVG..." /></label>
        <div className={styles.targetList}>{candidates.map((entry) => <TargetCard key={entry.id} clan={entry} ownClan={ownClan} onInspect={() => onInspect(entry.id)} />)}</div>
      </section>
    </div>
  );
}

function OpponentPreview({ ownClan, rival, onBack, onPrepare }: { ownClan: ClanSummary; rival: ClanSummary; onBack: () => void; onPrepare: () => void }) {
  const scoreDelta = ownClan.score - rival.score;
  return (
    <div className={styles.stack}>
      <section className={styles.previewHero}>
        <AssetImage assetKey="war.opponentPreview" />
        <div className={styles.previewShade} />
        <div className={styles.previewClan}><ClanMark clan={rival} large /><div><span>RIVAL HEADQUARTERS</span><h2>{rival.name}</h2><p>{rival.summary}</p></div></div>
      </section>
      <section className={styles.comparePanel}>
        <SectionTitle eyebrow="MATCHUP" title="Read the field before you attack" />
        <div className={styles.compareStats}>
          <article><span>RANK</span><strong>#{rival.rank}</strong><em>Yours #{ownClan.rank}</em></article>
          <article><span>HQ LEVEL</span><strong>{rival.level}</strong><em>Yours {ownClan.level}</em></article>
          <article><span>ROSTER</span><strong>{rival.members}/{rival.capacity}</strong><em>Yours {ownClan.members}/{ownClan.capacity}</em></article>
          <article><span>SCORE GAP</span><strong className={scoreDelta >= 0 ? styles.positive : styles.negative}>{scoreDelta >= 0 ? "+" : ""}{scoreDelta.toLocaleString()}</strong><em>season score</em></article>
        </div>
        <div className={styles.formRow}><span>RECENT WAR FORM</span><div><i>W</i><i>W</i><i className={styles.formLoss}>L</i><i>W</i><i className={styles.formDraw}>D</i></div></div>
      </section>
      <section className={styles.rulesCard}><HugeiconsIcon icon={InformationCircleIcon} size={19} strokeWidth={1.55} /><div><strong>War is won by task execution, not raw score.</strong><p>Both clans receive balanced operations. More completed operations wins. If both finish equally, the faster clan takes the result.</p></div></section>
      <div className={styles.actionBar}><button type="button" className={styles.secondaryAction} onClick={onBack}>Back to targets</button><button type="button" className={styles.primaryAction} onClick={onPrepare}>Prepare attack <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} /></button></div>
    </div>
  );
}

function LoadoutCard({ item, quantity, selected, onToggle }: { item: ClanInventoryItem; quantity: number; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`${styles.loadoutCard} ${selected ? styles.loadoutSelected : ""}`} onClick={onToggle}>
      <AssetImage assetKey={item.artKey} />
      <div><span>{item.kind} · ×{quantity}</span><strong>{item.name}</strong><p>{item.effect}</p></div>
      <em>{selected ? "SELECTED" : "SELECT"}</em>
    </button>
  );
}

function Preparation({ rival, ownedItemIds, selectedItemIds, onToggle, onBack, onDeploy }: { rival: ClanSummary; ownedItemIds: string[]; selectedItemIds: string[]; onToggle: (id: string) => void; onBack: () => void; onDeploy: () => void }) {
  const itemQty = (id: string) => ownedItemIds.filter((entry) => entry === id).length;
  const eligible = clanShopItems.filter((item) => itemQty(item.id) > 0 && (item.kind === "Booster" || item.kind === "Defence"));
  return (
    <div className={styles.stack}>
      <section className={styles.preparationHero}>
        <AssetImage assetKey="war.preparation" />
        <div><span>ATTACK PREPARATION</span><h2>Lock the plan before the war opens.</h2><p>{rival.name} is selected. The Captain can deploy up to two shared items, then the operation becomes visible to every Soldier.</p></div>
      </section>
      <section className={styles.warRules}>
        <article><span>WAR WINDOW</span><strong>4 hours</strong><p>Enough time for the whole roster to contribute.</p></article>
        <article><span>OPERATIONS</span><strong>4 clan tasks</strong><p>Balanced objectives are generated for both clans.</p></article>
        <article><span>TIE BREAK</span><strong>Fastest finish</strong><p>Equal completion is decided by total completion time.</p></article>
      </section>
      <section className={styles.panel}>
        <SectionTitle eyebrow="SHARED LOADOUT" title="Choose up to two items" action={<span className={styles.hint}>{selectedItemIds.length}/2 selected</span>} />
        {eligible.length ? <div className={styles.loadoutGrid}>{eligible.map((item) => <LoadoutCard key={item.id} item={item} quantity={itemQty(item.id)} selected={selectedItemIds.includes(item.id)} onToggle={() => onToggle(item.id)} />)}</div> : <div className={styles.emptyLoadout}><strong>No eligible items stored</strong><p>You can still deploy the attack without a shared item.</p></div>}
      </section>
      <div className={styles.actionBar}><button type="button" className={styles.secondaryAction} onClick={onBack}>Back</button><button type="button" className={styles.primaryAction} onClick={onDeploy}>Deploy attack <HugeiconsIcon icon={Sword01Icon} size={16} strokeWidth={1.7} /></button></div>
    </div>
  );
}

function ActiveWar({ captain, ownClan, rival, direction, ownProgress, enemyProgress, selectedItemIds }: { captain: boolean; ownClan: ClanSummary; rival: ClanSummary; direction: "attack" | "defence"; ownProgress: number; enemyProgress: number; selectedItemIds: string[] }) {
  const clanTasks = direction === "attack" ? attackClanTasks : defenceClanTasks;
  const personalTasks = direction === "attack" ? attackPersonalTasks : defencePersonalTasks;
  const items = selectedItemIds.map((id) => clanShopItems.find((entry) => entry.id === id)).filter((entry): entry is ClanInventoryItem => Boolean(entry));
  return (
    <div className={styles.stack}>
      <section className={styles.liveHero}>
        <AssetImage assetKey="war.active" />
        <div className={styles.liveShade} />
        <div><span>{direction === "attack" ? "ATTACK IN PROGRESS" : "HEADQUARTERS UNDER ATTACK"}</span><h2>{direction === "attack" ? "Push every operation forward." : "Hold the line together."}</h2><p>Every verified task moves the clan score. The board below shows exactly what matters now.</p></div>
      </section>
      <BattleIdentity ownClan={ownClan} rival={rival} direction={direction} ownProgress={ownProgress} enemyProgress={enemyProgress} />
      <section className={styles.victoryRule}><HugeiconsIcon icon={ChampionIcon} size={19} strokeWidth={1.55} /><div><strong>How this war is decided</strong><p>Complete more clan operations than {rival.name}. If both clans complete the same amount, the faster total completion time wins.</p></div></section>

      <section className={styles.panel}>
        <SectionTitle eyebrow="YOUR ORDERS" title={captain ? "Personal contribution" : "What you need to do now"} action={<span className={styles.hint}>{personalTasks.filter((task) => task.current >= task.target).length}/{personalTasks.length} complete</span>} />
        <div className={styles.taskList}>{personalTasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>
      </section>

      <section className={styles.panel}>
        <SectionTitle eyebrow="WAR OPERATIONS" title="Clan task board" action={<span className={styles.hint}>{clanTasks.filter((task) => task.current >= task.target).length}/{clanTasks.length} complete</span>} />
        <div className={styles.taskList}>{clanTasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>
      </section>

      {captain ? (
        <section className={styles.captainControl}>
          <div><span>CAPTAIN CONTROL</span><strong>The operation is locked.</strong><p>Once war starts, loadout and rules cannot be changed. Your job is to watch progress and keep the roster moving.</p></div>
          <div className={styles.deployedItems}>{items.length ? items.map((item) => <span key={item.id}><AssetImage assetKey={item.artKey} /><b>{item.name}</b></span>) : <em>No shared items deployed</em>}</div>
        </section>
      ) : null}

      <section className={styles.liveFeed}>
        <SectionTitle eyebrow="LIVE WAR LOG" title="Recent verified activity" />
        <article><span>NOW</span><div><strong>+3.2% clan progress</strong><p>Five verified actions landed in the same operation window.</p></div></article>
        <article><span>42s</span><div><strong>{rival.name} surged</strong><p>The rival completed a coordinated objective and moved their war score.</p></div></article>
        <article><span>2m</span><div><strong>Mira Vale completed an order</strong><p>Personal contribution was added to the shared operation.</p></div></article>
      </section>
    </div>
  );
}

function SoldierIdle({ ownClan }: { ownClan: ClanSummary | null }) {
  return (
    <div className={styles.stack}>
      <section className={styles.soldierIdle}>
        <AssetImage assetKey="war.active" />
        <div><span>SOLDIER WARFRONT</span><h2>No active war right now.</h2><p>{ownClan ? `${ownClan.name}'s Captain controls challenges and defence. When a war opens, this screen becomes your live orders board.` : "Join a clan first to receive Warfront orders."}</p></div>
      </section>
      <section className={styles.rulesCard}><HugeiconsIcon icon={InformationCircleIcon} size={19} strokeWidth={1.55} /><div><strong>You do not need to manage war settings.</strong><p>Soldiers only see the current opponent, live progress and the exact tasks they can complete for the clan.</p></div></section>
    </div>
  );
}

function ResultView({ ownClan, rival, resultId, ownProgress, enemyProgress, onContinue }: { ownClan: ClanSummary; rival: ClanSummary; resultId: string; ownProgress: number; enemyProgress: number; onContinue: () => void }) {
  const meta = warResults.find((entry) => entry.id === resultId) ?? warResults[0];
  return (
    <div className={styles.stack}>
      <section className={styles.resultHero}><AssetImage assetKey={meta.asset} /><div><span>WAR RESULT</span><h2>{meta.title}</h2><p>{meta.subtitle}</p></div></section>
      <BattleIdentity ownClan={ownClan} rival={rival} direction="attack" ownProgress={ownProgress} enemyProgress={enemyProgress} />
      <section className={styles.resultStats}><article><ChampionIconView /><div><span>SEASON SCORE</span><strong>{meta.scoreDelta >= 0 ? "+" : ""}{meta.scoreDelta}</strong></div></article><article><HugeiconsIcon icon={Wallet01Icon} size={20} strokeWidth={1.55} /><div><span>CLAN REWARD</span><strong>+{meta.reward.toLocaleString()}</strong></div></article><article><HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.55} /><div><span>OPERATIONS</span><strong>4 / 4</strong></div></article></section>
      <button type="button" className={styles.primaryWide} onClick={onContinue}>Continue to headquarters status <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} /></button>
    </div>
  );
}

function ChampionIconView() {
  return <HugeiconsIcon icon={ChampionIcon} size={20} strokeWidth={1.55} />;
}

function StatusView({ statusId }: { statusId: string }) {
  const meta = warStatuses.find((entry) => entry.id === statusId) ?? warStatuses[0];
  return (
    <div className={styles.stack}>
      <section className={styles.statusHero}><AssetImage assetKey={meta.asset} /><div><span>POST-WAR STATUS</span><h2>{meta.title}</h2><p>{meta.subtitle}</p><strong>{meta.durationLabel}</strong></div></section>
      <section className={styles.statusGrid}><article><span>WARFRONT</span><strong>Cooldown</strong></article><article><span>HEADQUARTERS</span><strong>Synchronized</strong></article><article><span>NEXT ACTION</span><strong>{meta.id === "reward" ? "Claim reward" : "Wait"}</strong></article></section>
    </div>
  );
}

function WarHistory({ onOpenRankings }: { onOpenRankings: () => void }) {
  const [selected, setSelected] = useState<ArenaWarHistoryEntry | null>(null);
  return (
    <div className={styles.stack}>
      <section className={styles.historyHero}><div><span>WAR ARCHIVE</span><h2>Your clan remembers every operation.</h2><p>Attack, defence, completion rate, MVP and reward stay visible after the timer ends.</p></div><AssetImage assetKey="war.victory" /></section>
      <section className={styles.historySummary}><article><span>RECORD</span><strong>2W · 1L · 1D</strong></article><article><span>ATTACKS</span><strong>2</strong></article><article><span>DEFENCES</span><strong>2</strong></article></section>
      <section className={styles.panel}>
        <SectionTitle eyebrow="RECENT WARS" title="Battle history" action={<button type="button" className={styles.textAction} onClick={onOpenRankings}>Rankings</button>} />
        <div className={styles.historyList}>
          {arenaWarHistory.map((entry) => {
            const rival = getClanById(entry.opponentId) ?? clanCatalog[0];
            const open = selected?.id === entry.id;
            return (
              <article key={entry.id} className={`${styles.historyEntry} ${open ? styles.historyEntryOpen : ""}`}>
                <button type="button" onClick={() => setSelected(open ? null : entry)}>
                  <span className={`${styles.resultBadge} ${styles[`result${entry.result}`]}`}>{entry.result === "victory" ? "W" : entry.result === "defeat" ? "L" : "D"}</span>
                  <ClanMark clan={rival} />
                  <div><strong>{rival.name}</strong><span>{entry.direction === "attack" ? "Attack" : "Defence"} · {entry.happenedLabel}</span></div>
                  <b>{entry.ourProgress}% — {entry.enemyProgress}%</b>
                </button>
                {open ? <div className={styles.historyDetail}><div><span>Duration</span><strong>{entry.durationLabel}</strong></div><div><span>Operations</span><strong>{entry.operationsCompleted}/{entry.operationsTotal}</strong></div><div><span>MVP</span><strong>{entry.mvp}</strong></div><div><span>Reward</span><strong>+{entry.reward.toLocaleString()}</strong></div></div> : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function PlayerPodium({ players }: { players: ArenaPlayerRank[] }) {
  return <div className={styles.podium}>{players.slice(0, 3).map((player, index) => <article key={player.id} className={styles.podiumCard}><span className={styles.podiumRank}>#{index + 1}</span><PlayerAvatar player={player} large /><strong>{player.name}</strong><p>{player.clan ?? "Independent"}</p><b>{player.score.toLocaleString()}</b></article>)}</div>;
}

function ClanPodium({ clans }: { clans: ClanSummary[] }) {
  return <div className={styles.podium}>{clans.slice(0, 3).map((clan, index) => <article key={clan.id} className={styles.podiumCard}><span className={styles.podiumRank}>#{index + 1}</span><ClanMark clan={clan} large /><strong>{clan.name}</strong><p>LVL {clan.level} · {clan.members}/{clan.capacity}</p><b>{clan.score.toLocaleString()}</b></article>)}</div>;
}

function Rankings({ mode, onMode, rankedClans, ownClan, level, currentName, currentPhotoUrl }: { mode: ArenaRankingMode; onMode: (mode: ArenaRankingMode) => void; rankedClans: ClanSummary[]; ownClan: ClanSummary | null; level: number; currentName: string; currentPhotoUrl?: string | null }) {
  return (
    <div className={styles.stack}>
      <section className={styles.seasonHero}><div><span>CURRENT SEASON</span><h2>{arenaSeason.name}</h2><p>Rankings remain global while Warfront adds clan-versus-clan competition.</p><div><strong>{arenaSeason.daysLeft} days left</strong><span>{Math.round(arenaSeason.progress * 100)}% complete</span></div><ProgressBar value={arenaSeason.progress * 100} /></div><AssetImage assetKey="arena.rewardCapsule" /></section>
      <section className={styles.panel}>
        <SectionTitle eyebrow="GLOBAL STANDINGS" title="Season Leaderboard" />
        <nav className={styles.rankingSwitch}><button type="button" className={mode === "players" ? styles.rankingSwitchActive : ""} onClick={() => onMode("players")}>Players</button><button type="button" className={mode === "clans" ? styles.rankingSwitchActive : ""} onClick={() => onMode("clans")}>Clans</button></nav>
        {mode === "players" ? <><PlayerPodium players={arenaPlayerRanking} /><div className={styles.rankingList}>{arenaPlayerRanking.slice(3).map((player) => <article key={player.id}><span>#{player.rank}</span><PlayerAvatar player={player} /><div><strong>{player.name}</strong><p>LVL {player.level} · {player.clan ?? "Independent"}</p></div><b>{player.score.toLocaleString()}</b></article>)}</div><div className={styles.selfRank}><span>#{arenaSeason.playerRank}</span><CurrentPlayerAvatar name={currentName} photoUrl={currentPhotoUrl} /><div><strong>You</strong><p>Level {level} · Current standing</p></div><b>{arenaSeason.playerScore.toLocaleString()}</b></div></> : <><ClanPodium clans={rankedClans} /><div className={styles.rankingList}>{rankedClans.slice(3, 8).map((entry) => <article key={entry.id}><span>#{entry.rank}</span><ClanMark clan={entry} /><div><strong>{entry.name}</strong><p>LVL {entry.level} · {entry.members}/{entry.capacity} members</p></div><b>{entry.score.toLocaleString()}</b></article>)}</div>{ownClan ? <div className={styles.selfRank}><span>#{ownClan.rank}</span><ClanMark clan={ownClan} /><div><strong>{ownClan.name}</strong><p>Your clan · Level {ownClan.level}</p></div><b>{ownClan.score.toLocaleString()}</b></div> : <div className={styles.noClanGate}><HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.55} /><div><strong>No clan standing yet</strong><p>Join or found a clan to appear in Clan Rankings.</p></div></div>}</>}
      </section>
    </div>
  );
}

export function ArenaPage() {
  const arena = useArenaWarStore();
  const clan = useClanStore();
  const level = useEarnStore((state) => state.level);
  const { adapter } = useTelegram();
  const [rankingMode, setRankingMode] = useState<ArenaRankingMode>("players");
  const telegramUser = adapter.getUser();
  const currentName = telegramUser?.first_name ?? "Explorer";
  const currentPhotoUrl = telegramUser?.photo_url ?? null;

  const ownClan = useMemo(() => {
    if (clan.membership !== "member") return null;
    if (clan.activeClanId === "captain-created" && clan.createdClan) return buildCreatedClanSummary(clan.createdClan);
    return getClanById(clan.activeClanId);
  }, [clan.activeClanId, clan.createdClan, clan.membership]);

  const rival = getClanById(arena.selectedOpponentId) ?? getClanById("void-runners") ?? clanCatalog[0];
  const captain = clan.role === "captain" && clan.membership === "member";
  const soldier = clan.role === "soldier" && clan.membership === "member";
  const rankedClans = useMemo(() => [...clanCatalog].sort((a, b) => a.rank - b.rank), []);

  useEffect(() => {
    const assets = arena.hubSection === "overview" ? arenaOverviewPreloadAssets : arena.hubSection === "war" ? arenaWarPreloadAssets : arena.hubSection === "history" ? arenaHistoryPreloadAssets : arenaRankingPreloadAssets;
    void preloadAssets(assets);
  }, [arena.hubSection]);

  const selectSection = (section: ArenaHubSection) => {
    if (section === arena.hubSection) return;
    adapter.selectionChanged();
    arena.setHubSection(section);
  };

  const openTargeting = () => {
    if (!captain || !ownClan) return;
    adapter.selectionChanged();
    arena.openTargeting();
  };

  const warContent = () => {
    if (!ownClan) return <SoldierIdle ownClan={null} />;
    if (arena.scenario === "attacking" || arena.scenario === "defending") return <ActiveWar captain={captain} ownClan={ownClan} rival={rival} direction={arena.scenario === "defending" ? "defence" : "attack"} ownProgress={arena.battleProgress} enemyProgress={arena.enemyProgress} selectedItemIds={arena.selectedItemIds} />;
    if (arena.scenario === "result") return <ResultView ownClan={ownClan} rival={rival} resultId={arena.result} ownProgress={arena.battleProgress} enemyProgress={arena.enemyProgress} onContinue={() => arena.showStatusForDiagnostics("protection")} />;
    if (arena.scenario === "status") return <StatusView statusId={arena.status} />;
    if (!captain) return <SoldierIdle ownClan={ownClan} />;
    if (arena.scenario === "preview") return <OpponentPreview ownClan={ownClan} rival={rival} onBack={arena.openTargeting} onPrepare={arena.beginPreparation} />;
    if (arena.scenario === "preparation") return <Preparation rival={rival} ownedItemIds={clan.ownedItemIds} selectedItemIds={arena.selectedItemIds} onToggle={arena.toggleItem} onBack={() => arena.selectOpponent(rival.id)} onDeploy={() => { adapter.hapticNotice("success"); arena.launchAttack(); }} />;
    return <TargetBrowser ownClan={ownClan} onInspect={(id) => { adapter.selectionChanged(); arena.selectOpponent(id); }} />;
  };

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />
        <header className={styles.pageHeader}><span>ARENA · WAR COMMAND</span><h1>{captain ? "Command the Warfront." : soldier ? "Enter the Warfront." : "Arena competition."}</h1><p>{captain ? "Choose rivals, prepare attacks, protect the headquarters and lead the clan through live operations." : soldier ? "See the active war, follow your orders and move the clan score with verified activity." : "Join a clan to enter Warfront. Rankings remain open to every player."}</p></header>

        <nav className={styles.arenaTabs} aria-label="Arena sections">
          {(["overview", "war", "history", "rankings"] as ArenaHubSection[]).map((section) => <button key={section} type="button" className={arena.hubSection === section ? styles.arenaTabActive : ""} onClick={() => selectSection(section)}>{section === "overview" ? "Overview" : section === "war" ? "War" : section === "history" ? "History" : "Rankings"}</button>)}
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={arena.hubSection} className={styles.sectionContent} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={mobileMotion.tab}>
            {arena.hubSection === "overview" ? <ArenaOverview captain={captain} ownClan={ownClan} rival={rival} scenario={arena.scenario} ownProgress={arena.battleProgress} enemyProgress={arena.enemyProgress} onOpenWar={() => arena.setHubSection("war")} onFindTarget={openTargeting} onOpenHistory={() => arena.setHubSection("history")} /> : null}
            {arena.hubSection === "war" ? warContent() : null}
            {arena.hubSection === "history" ? <WarHistory onOpenRankings={() => arena.setHubSection("rankings")} /> : null}
            {arena.hubSection === "rankings" ? <Rankings mode={rankingMode} onMode={(mode) => { adapter.selectionChanged(); setRankingMode(mode); }} rankedClans={rankedClans} ownClan={ownClan} level={level} currentName={currentName} currentPhotoUrl={currentPhotoUrl} /> : null}
          </motion.div>
        </AnimatePresence>
      </main>
    </GameShell>
  );
}
