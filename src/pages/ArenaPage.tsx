import {
  AdventureIcon,
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
import { arenaPlayerRanking, arenaPreloadAssets, arenaSeason } from "@/game/arena/arenaCatalog";
import type { ArenaPlayerRank, ArenaRankingMode } from "@/game/arena/types";
import { clanCatalog, getClanById } from "@/game/clan/clanCatalog";
import { useClanStore } from "@/game/clan/clanStore";
import type { ClanSummary } from "@/game/clan/types";
import { getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import { useEarnStore } from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ArenaPage.module.css";

function PlayerAvatar({ player, large = false }: { player: ArenaPlayerRank; large?: boolean }) {
  return (
    <div className={`${styles.playerAvatar} ${large ? styles.playerAvatarLarge : ""}`} style={{ "--identity-hue": player.accentHue } as CSSProperties}>
      <span>{player.initials}</span>
      <AssetImage assetKey="profile.frame.standard" className={styles.playerFrame} />
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

export function ArenaPage() {
  const [rankingMode, setRankingMode] = useState<ArenaRankingMode>("players");
  const level = useEarnStore((state) => state.level);
  const clan = useClanStore();
  const { adapter } = useTelegram();

  useEffect(() => {
    void preloadAssets(arenaPreloadAssets);
  }, []);

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
          <span>ARENA · SEASON 1</span>
          <h1>Rise through the ranks.</h1>
          <p>The Arena is Dexo Land&apos;s competition hub. Season 1 is about standing; Warfront arrives in Season 2.</p>
        </header>

        <div className={styles.stack}>
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

          <section className={styles.yourStanding}>
            <div className={styles.standingLead}>
              <span>YOUR SEASON</span>
              <strong>Keep climbing.</strong>
              <p>Rankings stay simple in Season 1: one score for players and one for clans.</p>
            </div>
            <div className={styles.standingStats}>
              <article><span>PLAYER RANK</span><strong>#{arenaSeason.playerRank}</strong></article>
              <article><span>YOUR SCORE</span><strong>{arenaSeason.playerScore.toLocaleString()}</strong></article>
              <article><span>LEVEL</span><strong>{level}</strong></article>
            </div>
          </section>

          <section className={styles.rankingsPanel}>
            <div className={styles.panelHeading}>
              <div><span>GLOBAL STANDINGS</span><strong>Season Leaderboard</strong></div>
              <em>Live mock data</em>
            </div>

            <nav className={styles.rankingSwitch} aria-label="Arena ranking type">
              <button type="button" className={rankingMode === "players" ? styles.rankingSwitchActive : ""} onClick={() => selectRanking("players")}>Players</button>
              <button type="button" className={rankingMode === "clans" ? styles.rankingSwitchActive : ""} onClick={() => selectRanking("clans")}>Clans</button>
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
                      <span>#247</span>
                      <div className={styles.selfGlyph}><HugeiconsIcon icon={AdventureIcon} size={18} strokeWidth={1.55} /></div>
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

          <section className={styles.warfront}>
            <div className={styles.warScene}>
              <AssetImage assetKey="war.matchmaking" className={styles.warArt} />
              <div className={styles.warShade} />
              <span className={styles.seasonTwoBadge}>SEASON 2</span>
            </div>
            <div className={styles.warCopy}>
              <span>WARFRONT PROTOCOL</span>
              <h2>Clan wars are next.</h2>
              <p>Season 2 expands Arena with clan-versus-clan War, Defence and post-battle protection. The system stays locked until then.</p>
              <div className={styles.futurePillRow}>
                <span><HugeiconsIcon icon={Sword01Icon} size={15} strokeWidth={1.55} /> War</span>
                <span><HugeiconsIcon icon={ChampionIcon} size={15} strokeWidth={1.55} /> Defence</span>
                <span><HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={1.55} /> Rivalry</span>
              </div>
              <button type="button" disabled>Unlocks in Season 2</button>
            </div>
          </section>

          <section className={styles.arenaNote}>
            <HugeiconsIcon icon={AdventureIcon} size={20} strokeWidth={1.5} />
            <div><strong>One competition hub.</strong><p>Rankings live here permanently. New competitive modes will open inside Arena instead of adding more destinations to the main navigation.</p></div>
          </section>
        </div>
      </main>
    </GameShell>
  );
}
