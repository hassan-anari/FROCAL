import {
  ChampionIcon,
  Sword01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { preloadAssets } from "@/assets/preload";
import { AssetImage } from "@/design-system/components/AssetImage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import {
  arenaPlayerRanking,
  arenaRankingPreloadAssets,
  arenaSeason,
  arenaWarfrontPreloadAssets,
} from "@/game/arena/arenaCatalog";
import type { ArenaPlayerRank, ArenaRankingMode } from "@/game/arena/types";
import { clanCatalog, getClanById } from "@/game/clan/clanCatalog";
import { useClanStore } from "@/game/clan/clanStore";
import type { ClanSummary } from "@/game/clan/types";
import { getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import { useEarnStore } from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ArenaPage.module.css";

type ArenaSection = "warfront" | "rankings";

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
  return (
    <div className={styles.currentPlayerAvatar}>
      {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initial}</span>}
    </div>
  );
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

function PlayerPodium({ players }: { players: ArenaPlayerRank[] }) {
  return (
    <div className={styles.podium}>
      {players.slice(0, 3).map((player, index) => (
        <article key={player.id} className={styles.podiumCard}>
          <span className={styles.podiumRank}>#{index + 1}</span>
          <PlayerAvatar player={player} large />
          <strong>{player.name}</strong>
          <p>{player.clan ?? "Independent"}</p>
          <b>{player.score.toLocaleString()}</b>
        </article>
      ))}
    </div>
  );
}

function ClanPodium({ clans }: { clans: ClanSummary[] }) {
  return (
    <div className={styles.podium}>
      {clans.slice(0, 3).map((clan, index) => (
        <article key={clan.id} className={styles.podiumCard}>
          <span className={styles.podiumRank}>#{index + 1}</span>
          <ClanMark clan={clan} large />
          <strong>{clan.name}</strong>
          <p>LVL {clan.level} · {clan.members}/{clan.capacity}</p>
          <b>{clan.score.toLocaleString()}</b>
        </article>
      ))}
    </div>
  );
}

function PlayerRankingList({ players }: { players: ArenaPlayerRank[] }) {
  return (
    <div className={styles.rankingList}>
      {players.slice(3).map((player) => (
        <article key={player.id}>
          <span className={styles.listRank}>#{player.rank}</span>
          <PlayerAvatar player={player} />
          <div className={styles.rankingIdentity}><strong>{player.name}</strong><span>LVL {player.level} · {player.clan ?? "Independent"}</span></div>
          <b>{player.score.toLocaleString()}</b>
        </article>
      ))}
    </div>
  );
}

function ClanRankingList({ clans }: { clans: ClanSummary[] }) {
  return (
    <div className={styles.rankingList}>
      {clans.slice(3, 8).map((clan) => (
        <article key={clan.id}>
          <span className={styles.listRank}>#{clan.rank}</span>
          <ClanMark clan={clan} />
          <div className={styles.rankingIdentity}><strong>{clan.name}</strong><span>LVL {clan.level} · {clan.members}/{clan.capacity} members</span></div>
          <b>{clan.score.toLocaleString()}</b>
        </article>
      ))}
    </div>
  );
}

function WarfrontTab() {
  return (
    <div className={styles.warfrontStack}>
      <section className={styles.warfrontHero}>
        <div className={styles.warfrontScene}>
          <AssetImage assetKey="war.active" className={styles.warfrontHeroArt} />
          <div className={styles.warfrontHeroShade} />
          <div className={styles.warfrontSignal}>SEASON 2 · WARFRONT</div>
        </div>
        <div className={styles.warfrontIntro}>
          <span>THE NEXT ERA OF ARENA</span>
          <h2>When rankings become a battlefield.</h2>
          <p>
            Season 2 opens clan-versus-clan Warfront. Your clan will match with a rival, prepare a shared plan,
            choose its loadout and fight through coordinated member activity. The result belongs to the whole clan.
          </p>
        </div>
      </section>

      <section className={styles.warFlowPanel}>
        <div className={styles.sectionHeading}>
          <div><span>HOW WARFRONT PLAYS</span><strong>One battle. Three clear phases.</strong></div>
          <em>Season 2</em>
        </div>

        <div className={styles.warFlowGrid}>
          <article>
            <div className={styles.warFlowArt}><AssetImage assetKey="war.matchmaking" /></div>
            <span>01 · MATCH</span>
            <strong>Find a rival clan</strong>
            <p>Arena searches the seasonal pool and presents the opponent before anyone commits resources.</p>
          </article>
          <article>
            <div className={styles.warFlowArt}><AssetImage assetKey="war.preparation" /></div>
            <span>02 · PREPARE</span>
            <strong>Build one clan plan</strong>
            <p>Review the opponent, prepare shared items and lock the clan setup before the countdown begins.</p>
          </article>
          <article>
            <div className={styles.warFlowArt}><AssetImage assetKey="war.active" /></div>
            <span>03 · BATTLE</span>
            <strong>Fight through activity</strong>
            <p>Verified member actions move live war progress until the battle closes and the result is sealed.</p>
          </article>
        </div>
      </section>

      <section className={styles.defenceBrief}>
        <div className={styles.defenceBriefArt}>
          <AssetImage assetKey="war.defenceSetup" />
        </div>
        <div className={styles.defenceBriefCopy}>
          <span>WAR DOESN&apos;T END AT ATTACK</span>
          <h3>Defend the headquarters.</h3>
          <p>
            Incoming wars will make Defence matter too. Protection, recovery and defensive clan items give the HQ a
            life after every battle instead of turning Warfront into a single result screen.
          </p>
          <div className={styles.warFeatureRow}>
            <span><HugeiconsIcon icon={Sword01Icon} size={15} strokeWidth={1.55} /> Clan War</span>
            <span><HugeiconsIcon icon={ChampionIcon} size={15} strokeWidth={1.55} /> Defence</span>
            <span><HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={1.55} /> Rewards</span>
          </div>
        </div>
      </section>

      <section className={styles.warfrontLock}>
        <div>
          <span>SEASON 1 STATUS</span>
          <strong>Warfront is built for the next season.</strong>
          <p>For now, Arena stays focused on one simple competition: climb the Player and Clan rankings.</p>
        </div>
        <button type="button" disabled>Unlocks in Season 2</button>
      </section>
    </div>
  );
}

function RankingsTab({
  rankingMode,
  onSelectRanking,
  rankedClans,
  ownClan,
  level,
  currentName,
  currentPhotoUrl,
}: {
  rankingMode: ArenaRankingMode;
  onSelectRanking: (mode: ArenaRankingMode) => void;
  rankedClans: ClanSummary[];
  ownClan: ClanSummary | null;
  level: number;
  currentName: string;
  currentPhotoUrl?: string | null;
}) {
  return (
    <div className={styles.rankingsStack}>
      <section className={styles.seasonHero}>
        <div className={styles.seasonGlow} />
        <div className={styles.seasonCopy}>
          <span>FOUNDING SEASON</span>
          <h2>Season {String(arenaSeason.number).padStart(2, "0")}</h2>
          <p>Every verified action moves your seasonal score. Finish as high as you can before the reset.</p>
          <div className={styles.seasonMeta}>
            <strong>{arenaSeason.daysLeft} days left</strong>
            <span>{Math.round(arenaSeason.progress * 100)}% complete</span>
          </div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${arenaSeason.progress})` }} /></div>
        </div>
        <AssetImage assetKey="arena.rewardCapsule" className={styles.seasonArt} />
      </section>

      <section className={styles.rankingsPanel}>
        <div className={styles.panelHeading}>
          <div><span>GLOBAL STANDINGS</span><strong>Season Leaderboard</strong></div>
          <em>Live mock data</em>
        </div>

        <nav className={styles.rankingSwitch} aria-label="Arena ranking type">
          <button type="button" className={rankingMode === "players" ? styles.rankingSwitchActive : ""} onClick={() => onSelectRanking("players")}>Players</button>
          <button type="button" className={rankingMode === "clans" ? styles.rankingSwitchActive : ""} onClick={() => onSelectRanking("clans")}>Clans</button>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={rankingMode}
            className={styles.rankingContent}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={mobileMotion.tab}
          >
            {rankingMode === "players" ? (
              <>
                <PlayerPodium players={arenaPlayerRanking} />
                <PlayerRankingList players={arenaPlayerRanking} />
                <div className={styles.selfRankRow}>
                  <span>#{arenaSeason.playerRank}</span>
                  <CurrentPlayerAvatar name={currentName} photoUrl={currentPhotoUrl} />
                  <div><strong>You</strong><p>Level {level} · Current season standing</p></div>
                  <b>{arenaSeason.playerScore.toLocaleString()}</b>
                </div>
              </>
            ) : (
              <>
                <ClanPodium clans={rankedClans} />
                <ClanRankingList clans={rankedClans} />
                {ownClan ? (
                  <div className={styles.selfRankRow}>
                    <span>#{ownClan.rank}</span>
                    <ClanMark clan={ownClan} />
                    <div><strong>{ownClan.name}</strong><p>Your clan · Level {ownClan.level}</p></div>
                    <b>{ownClan.score.toLocaleString()}</b>
                  </div>
                ) : (
                  <div className={styles.noClanRank}>
                    <HugeiconsIcon icon={UserGroupIcon} size={20} strokeWidth={1.55} />
                    <div><strong>No clan standing yet</strong><p>Join or found a clan to appear in the Clan Leaderboard.</p></div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

export function ArenaPage() {
  const [section, setSection] = useState<ArenaSection>("warfront");
  const [rankingMode, setRankingMode] = useState<ArenaRankingMode>("players");
  const level = useEarnStore((state) => state.level);
  const clan = useClanStore();
  const { adapter } = useTelegram();
  const telegramUser = adapter.getUser();
  const currentName = telegramUser?.first_name ?? "Explorer";
  const currentPhotoUrl = telegramUser?.photo_url ?? null;

  useEffect(() => {
    void preloadAssets(section === "warfront" ? arenaWarfrontPreloadAssets : arenaRankingPreloadAssets);
  }, [section]);

  const rankedClans = useMemo(() => [...clanCatalog].sort((a, b) => a.rank - b.rank), []);
  const ownClan = useMemo(() => {
    if (clan.membership !== "member") return null;
    if (clan.activeClanId === "captain-created" && clan.createdClan) {
      return {
        id: "captain-created",
        name: clan.createdClan.name,
        tag: clan.createdClan.tag,
        level: 3,
        members: 8,
        capacity: 24,
        rank: 22,
        score: 24_860,
        status: "Recruiting",
        summary: clan.createdClan.motto,
        accent: clan.createdClan.accent,
        imageUrl: clan.createdClan.telegramGroupPhotoUrl ?? null,
      } satisfies ClanSummary;
    }
    return getClanById(clan.activeClanId);
  }, [clan.activeClanId, clan.createdClan, clan.membership]);

  const selectSection = (next: ArenaSection) => {
    if (next === section) return;
    adapter.selectionChanged();
    setSection(next);
  };

  const selectRanking = (mode: ArenaRankingMode) => {
    if (mode === rankingMode) return;
    adapter.selectionChanged();
    setRankingMode(mode);
  };

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />

        <header className={styles.pageHeader}>
          <span>ARENA · COMPETITION HUB</span>
          <h1>Compete. Rise. Prepare.</h1>
          <p>Season 1 ranks players and clans. Season 2 turns the Arena into a battlefield.</p>
        </header>

        <nav className={styles.arenaTabs} aria-label="Arena sections">
          <button type="button" className={section === "warfront" ? styles.arenaTabActive : ""} onClick={() => selectSection("warfront")}>
            <span>Warfront</span><em>S2</em>
          </button>
          <button type="button" className={section === "rankings" ? styles.arenaTabActive : ""} onClick={() => selectSection("rankings")}>
            <span>Rankings</span>
          </button>
        </nav>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={section}
            className={styles.sectionContent}
            initial={{ opacity: 0, x: 7 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={mobileMotion.tab}
          >
            {section === "warfront" ? (
              <WarfrontTab />
            ) : (
              <RankingsTab
                rankingMode={rankingMode}
                onSelectRanking={selectRanking}
                rankedClans={rankedClans}
                ownClan={ownClan}
                level={level}
                currentName={currentName}
                currentPhotoUrl={currentPhotoUrl}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </GameShell>
  );
}
