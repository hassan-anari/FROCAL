import { ClanRecentActivity } from "@/features/clan/ClanRecentActivity";
import { clanRankLabel } from "@/integrations/api/clanActivity";
import { ClanQueryState } from "@/features/clan/ClanQueryState";
import { clanAddBotUrl } from "@/integrations/telegram/botLinks";
import { showFeedback } from "@/design-system/components/TransientFeedback";
import { applicationStatusMessage } from "@/integrations/api/clanApplications";
import { useClanRemote, type ClanRemote } from "@/integrations/api/useClanRemote";
import { clanSummary, clanMember, clanApplicant, clanItem, clanEquipmentMetrics, clanMission, clanTrophy, clanItemBlockedLabel } from "@/integrations/api/clanViews";
import { clanTone, saveClanTone } from "@/integrations/api/clanAppearance";
import { ClanStatusSheet } from "@/features/clan/ClanStatusSheet";
import { QueryContinuation } from "@/design-system/performance/QueryContinuation";
import { useBootstrap } from "@/integrations/api/BootstrapProvider";
import { AvatarContent } from "@/design-system/components/AvatarContent";
import { isRemoteDataSource } from "@/integrations/api/bootstrap";
import {
  ArrowRight01Icon,
  SquareActivityIcon,
  InformationCircleIcon,
  Sword01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AssetImage } from "@/design-system/components/AssetImage";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { Button } from "@/design-system/primitives/Button";
import { DeferredMount } from "@/design-system/performance/DeferredMount";
import {
  ClanModal,
  ClanAchievementsSheet,
  ClanItemSheet,
  ClanPreviewSheet,
  JoinRequestsSheet,
  RoleConfirmSheet,
} from "@/features/clan/ClanOverlays";
import {
  clanAchievements,
  clanCatalog,
  eligibleClanGroups,
  clanMembers,
  clanShopItems,
  clanTasks,
  getClanById,
  getClanItemById,
  suggestedClanIds,
} from "@/game/clan/clanCatalog";
import { useClanStore } from "@/game/clan/clanStore";
import type {
  ClanAchievement,
  ClanMember,
  ClanTask,
  ClanActiveEffect,
  ClanEligibleGroup,
  ClanInventoryItem,
  ClanJoinApplicant,
  ClanRole,
  ClanSummary,
  CreatedClan,
  HeadquartersTab,
  SoldierClanTab,
  TaskFilter,
} from "@/game/clan/types";
import { clanRoleArt, getClanEmblemAssetKey, getClanHqStateAssetKey, getClanRoomAssetKey, getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import { usePlayerProgression } from "@/integrations/api/usePlayerProgression";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ClanPage.module.css";

type OverlayState =
  | { type: "role"; role: ClanRole }
  | { type: "clan"; clanId: string }
  | { type: "item"; itemId: string; source: "inventory" | "shop" }
  | { type: "requests" }
  | { type: "trophies" }
  | null;

function openClanBot(adapter: ReturnType<typeof useTelegram>["adapter"]) {
  const url = clanAddBotUrl();
  if (url) adapter.openTelegramLink(url);
  else showFeedback("The Telegram bot link is unavailable. Please try again later.");
}

function ClanEmblem({
  clan,
  size = "md",
}: {
  clan: Pick<ClanSummary, "name" | "tag" | "accent" | "imageUrl">;
  size?: "sm" | "md" | "lg";
}) {
  const initials = getIdentityInitials(clan.name);
  const hue = getIdentityHue(clan.name);
  return (
    <div
      className={`${styles.emblem} ${styles[clan.accent]} ${styles[`emblem${size}`]}`}
      style={{ "--identity-hue": hue } as CSSProperties}
      aria-label={`${clan.name} clan emblem`}
    >
      <span className={styles.emblemFallback}>
        {clan.imageUrl ? <img src={clan.imageUrl} alt="" /> : <b>{initials}</b>}
      </span>
      <AssetImage assetKey={getClanEmblemAssetKey()} className={styles.emblemFrame} />
    </div>
  );
}

function MemberAvatar({ name, avatarUrl, captain = false }: { name: string; avatarUrl?: string | null; captain?: boolean }) {
  const hue = getIdentityHue(name);
  return (
    <div className={styles.memberAvatar} style={{ "--identity-hue": hue } as CSSProperties}>
      <span><AvatarContent owner={`clan-member:${name}`} photoUrl={avatarUrl} fallback={getIdentityInitials(name)} /></span>
      <AssetImage assetKey={captain ? "profile.frame.captain" : "profile.frame.clan"} className={styles.memberFrame} />
    </div>
  );
}

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
    fresh: true,
    imageUrl: created.telegramGroupPhotoUrl ?? null,
    match: 100,
  };
}

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <header className={styles.sectionTitle}>
      <div><span>{eyebrow}</span><h2>{title}</h2></div>
      {action}
    </header>
  );
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function RoomHero({ tab, shop = false, effects = 0, hqStateLabel = "ONLINE", facilities = "3 online" }: { tab: HeadquartersTab; shop?: boolean; effects?: number; hqStateLabel?: string; facilities?: string }) {
  if (tab === "home") {
    return (
      <section className={styles.homeHero}>
        <div className={styles.homeHeroTop}>
          <div className={styles.homeHeroCopy}><span>HEADQUARTERS OVERVIEW</span><strong>Command overview</strong><p>Core systems, current status and clan facilities live here.</p></div>
          <AssetImage assetKey="clan.hq" className={styles.homeHeroArt} />
        </div>
        <div className={styles.homeHeroMetrics}>
          <article><span>STATUS</span><strong>{hqStateLabel}</strong></article>
          <article><span>FACILITIES</span><strong>{facilities}</strong></article>
          <article><span>EFFECTS</span><strong>{effects} active</strong></article>
        </div>
      </section>
    );
  }

  const content = tab === "tasks"
    ? { eyebrow: "OPERATIONS", title: "Mission Room", copy: "Track shared objectives and individual clan contribution." }
    : tab === "members"
      ? { eyebrow: "ROSTER", title: "Roster Room", copy: "Review the active lineup, roles and contribution order." }
      : shop
        ? { eyebrow: "ARMORY", title: "Clan Shop", copy: "Spend shared Treasury on reusable clan equipment." }
        : { eyebrow: "LOADOUT", title: "Inventory Room", copy: "Store, inspect and activate the clan's shared equipment." };
  return (
    <section className={styles.roomHero}>
      <div className={styles.roomHeroCopy}><span>{content.eyebrow}</span><strong>{content.title}</strong><p>{content.copy}</p></div>
      <AssetImage assetKey={getClanRoomAssetKey(tab, shop)} className={styles.roomHeroArt} />
    </section>
  );
}

function ActiveEffectsStrip({ effects, serverNow = Date.now, items }: { effects: ClanActiveEffect[]; serverNow?: () => number; items?: readonly ClanInventoryItem[] }) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(serverNow()), 1000);
    return () => window.clearInterval(timer);
  }, [serverNow]);
  const active = effects
    .filter((effect) => effect.endsAt > now)
    .map((effect) => ({ effect, item: items ? items.find(item => item.id === effect.itemId) ?? null : getClanItemById(effect.itemId) }))
    .filter((entry): entry is { effect: ClanActiveEffect; item: ClanInventoryItem } => entry.item !== null);
  if (active.length === 0) return null;

  return (
    <section className={styles.activeEffects}>
      <div className={styles.activeEffectsHeading}><span>ACTIVE CLAN EFFECTS</span><strong>{active.length} online</strong></div>
      <div className={styles.activeEffectsTrack}>
        {active.map(({ effect, item }) => (
          <article key={effect.id}>
            <AssetImage assetKey={item.artKey} className={styles.activeEffectArt} />
            <div><strong>{item.name}</strong><span>{item.activationVerb} · {formatRemaining(effect.endsAt - now)}</span></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function LockedClan({ level, minLevel = 5 }: { level: number; minLevel?: number }) {
  const ratio = Math.min(1, level / minLevel);
  return (
    <div className={styles.stack}>
      <section className={styles.lockedScene}>
        <div className={styles.sceneGlow} />
        <AssetImage assetKey="clan.hq.stateLocked" className={styles.lockedArt} />
        <div className={styles.lockedCopy}>
          <span className={styles.eyebrow}>CLAN SYSTEM · LEVEL {minLevel}</span>
          <h2>Headquarters access locked</h2>
          <p>Grow your Dexo to Level {minLevel}, then choose one seasonal path: lead a clan or fight for one.</p>
        </div>
        <div className={styles.unlockProgress}>
          <div><span>Access progress</span><strong>LVL {level} / {minLevel}</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
        </div>
      </section>

      <section className={styles.unlockStrip}>
        <article><HugeiconsIcon icon={UserGroupIcon} size={19} strokeWidth={1.55} /><div><strong>Choose a role</strong><span>Captain or Soldier</span></div></article>
        <article><HugeiconsIcon icon={Sword01Icon} size={19} strokeWidth={1.55} /><div><strong>Shared missions</strong><span>Build progress together</span></div></article>
        <article><HugeiconsIcon icon={Wallet01Icon} size={19} strokeWidth={1.55} /><div><strong>Clan resources</strong><span>Unlock inventory & Treasury</span></div></article>
      </section>
    </div>
  );
}

function RoleChoice({ onChoose, disabled = false }: { onChoose: (role: ClanRole) => void; disabled?: boolean }) {
  return (
    <div className={styles.stack}>
      <section className={styles.roleIntro}>
        <span className={styles.eyebrow}>SEASONAL CLAN PATH</span>
        <h2>Choose where you stand.</h2>
        <p>One role for the season. Captain builds the home. Soldier earns a place inside one.</p>
      </section>

      <section className={styles.roleGrid}>
        <button type="button" className={`${styles.roleCard} ${styles.captainCard}`} disabled={disabled} onClick={() => onChoose("captain")}>
          <div className={styles.roleArtStage}>
            <span className={styles.roleHalo} />
            <motion.div className={styles.roleFloat} animate={{ y: [0, -5, 0], rotate: [0, .6, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}><AssetImage assetKey={clanRoleArt.captain} className={styles.roleArt} /></motion.div>
          </div>
          <div className={styles.roleCopy}>
            <span>LEADERSHIP PATH</span>
            <h3>Captain</h3>
            <p>Found the headquarters, review recruits and control shared clan resources.</p>
          </div>
          <em>Lead a clan <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} /></em>
        </button>

        <button type="button" className={`${styles.roleCard} ${styles.soldierCard}`} disabled={disabled} onClick={() => onChoose("soldier")}>
          <div className={styles.roleArtStage}>
            <span className={styles.roleHalo} />
            <motion.div className={styles.roleFloat} animate={{ y: [0, -5, 0], rotate: [0, -.6, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut", delay: .25 }}><AssetImage assetKey={clanRoleArt.soldier} className={styles.roleArt} /></motion.div>
          </div>
          <div className={styles.roleCopy}>
            <span>CONTRIBUTION PATH</span>
            <h3>Soldier</h3>
            <p>Join one clan, complete missions and turn your activity into team progress.</p>
          </div>
          <em>Find a clan <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} /></em>
        </button>
      </section>

      <div className={styles.choiceNote}>
        <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.55} />
        <span>Your confirmed path stays locked for the current season.</span>
      </div>
    </div>
  );
}

function ClanCard({
  clan,
  pendingClanId,
  onOpen,
}: {
  clan: ClanSummary;
  pendingClanId: string | null;
  onOpen: () => void;
}) {
  const pending = pendingClanId === clan.id;
  return (
    <button type="button" className={styles.clanCard} onClick={onOpen}>
      <ClanEmblem clan={clan} size="sm" />
      <div className={styles.clanCardCopy}>
        <div className={styles.clanNameRow}>
          <strong>{clan.name}</strong>
          {clan.fresh ? <em>ACTIVE</em> : null}
        </div>
        <span>LVL {clan.level} · {clan.members}/{clan.capacity} members · Rank {clanRankLabel(clan.rank, clan.rankStatus)}</span>
        <div className={styles.miniMeta}>
          <span>{clan.status}</span>
          <span>{pending ? "Request pending" : clan.match === undefined ? "—" : `${clan.match}% match`}</span>
        </div>
      </div>
      <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.6} />
    </button>
  );
}

function FeaturedClan({ clan, onOpen, remote = false }: { clan: ClanSummary; onOpen: () => void; remote?: boolean }) {
  return (
    <button type="button" className={`${styles.featuredClan} ${styles[clan.accent]}`} onClick={onOpen}>
      <AssetImage assetKey={getClanHqStateAssetKey(clan.hqState ?? "normal", clan.level)} className={styles.featuredHq} />
      <div className={styles.featuredShade} />
      <div className={styles.featuredTop}>
        <ClanEmblem clan={clan} size="md" />
        <span>{clanRankLabel(clan.rank, clan.rankStatus)} SEASON</span>
      </div>
      <div className={styles.featuredCopy}>
        <span>{remote ? "CLAN NETWORK" : `RECOMMENDED · ${clan.match ?? 90}% MATCH`}</span>
        <strong>{clan.name}</strong>
        <p>{clan.summary}</p>
        <em>{clan.members}/{clan.capacity} members · Level {clan.level} <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.7} /></em>
      </div>
    </button>
  );
}

function PendingJoinCard({ clan, rejected, accepted = false }: { clan: Pick<ClanSummary, "name" | "tag" | "accent" | "imageUrl"> | null; rejected: boolean; accepted?: boolean }) {
  if (!clan) return null;
  return (
    <section className={`${styles.requestState} ${rejected ? styles.requestRejected : ""}`}>
      <ClanEmblem clan={clan} size="sm" />
      <div>
        <span>{rejected ? "REQUEST CLOSED" : accepted ? "REQUEST ACCEPTED" : "REQUEST IN REVIEW"}</span>
        <strong>{clan.name}</strong>
        <p>{rejected ? "The slot stayed closed. You can search for another clan." : accepted ? "Open Clan status to verify your Telegram membership." : "Your only active request is waiting for Captain review."}</p>
      </div>
      <em>{rejected ? "Search unlocked" : accepted ? "Accepted" : "Pending"}</em>
    </section>
  );
}

function SoldierNetwork({
  pendingClanId,
  requestState,
  onOpenClan,
  live,
}: {
  pendingClanId: string | null;
  requestState: "none" | "pending" | "rejected";
  onOpenClan: (clanId: string) => void;
  live?: ClanRemote;
}) {
  const [tab, setTab] = useState<SoldierClanTab>("discover");
  const [query, setQuery] = useState("");

  useEffect(() => { const timer = window.setTimeout(() => live?.setSearch(query.trim()), 250); return () => window.clearTimeout(timer); }, [query, live?.setSearch]);
  const pendingClan = live ? live.requestIdentity.data ? clanSummary(live.requestIdentity.data) : live.activeRequest ? { name: live.activeRequest.clan_name, tag: "", accent: "cyan" as const } : null : getClanById(pendingClanId);
  const suggested = live ? live.clans.map(clanSummary) : suggestedClanIds
    .map((id) => getClanById(id))
    .filter((clan): clan is ClanSummary => clan !== null);

  const filtered = useMemo(() => {
    if (live) return live.clans.map(clanSummary);
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clanCatalog;
    return clanCatalog.filter((clan) =>
      clan.name.toLowerCase().includes(normalized) || clan.tag.toLowerCase().includes(normalized),
    );
  }, [query, live?.clans]);

  const featured = suggested[0];

  return (
    <div className={styles.stack}>
      {requestState === "pending" ? <PendingJoinCard clan={pendingClan} rejected={false} accepted={live?.activeRequest?.state === "ACCEPTED"} /> : null}
      {requestState === "rejected" ? <PendingJoinCard clan={pendingClan} rejected /> : null}

      <nav className={styles.subnav} aria-label="Clan discovery sections">
        {(["discover", "search"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? styles.subnavActive : ""} onClick={() => { setTab(item); if (item === "discover") setQuery(""); }}>
            {item === "discover" ? "Discover" : "Search"}
          </button>
        ))}
      </nav>

      <DeferredMount minHeight={420}>
      <motion.div
          key={tab}
          className={styles.tabContent}
          initial={{ opacity: .96 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: .98 }}
          transition={mobileMotion.tab}
        >
          {tab === "discover" ? (
            <>
              {featured ? <FeaturedClan remote={Boolean(live)} clan={featured} onOpen={() => onOpenClan(featured.id)} /> : null}
              <section className={styles.panel}>
                <SectionTitle eyebrow="OPEN RECRUITMENT" title="More clans for you" action={<span className={styles.sectionHint}>One request at a time</span>} />
                <div className={styles.clanList} data-clan-discovery>
                  {suggested.slice(1).map((clan) => (
                    <ClanCard key={clan.id} clan={clan} pendingClanId={pendingClanId} onOpen={() => onOpenClan(clan.id)} />
                  ))}
                </div>
              </section>

              <section className={styles.networkPulse}>
                <div><span>CLAN NETWORK</span><strong>{live ? `${live.clans.length} clans shown` : `${clanCatalog.length} active HQs`}</strong></div>
                <p>Choose for fit, not size. Capacity grows with clan progression.</p>
              </section>
            </>
          ) : null}

          {tab === "search" ? (
            <section className={styles.panel}>
              <SectionTitle eyebrow="FIND A CLAN" title="Search the network" />
              <label className={styles.searchBox}>
                <span>Clan name or tag</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nova, NVG..." />
              </label>
              <div className={styles.searchCount}>{filtered.length} clans found</div>
              <div className={styles.clanList} data-clan-discovery>
                {filtered.map((clan) => (
                  <ClanCard key={clan.id} clan={clan} pendingClanId={pendingClanId} onOpen={() => onOpenClan(clan.id)} />
                ))}
              </div>
            </section>
          ) : null}

          {live ? <QueryContinuation selector="[data-clan-discovery] > button:last-of-type" hasNext={live.discovery.hasNextPage && !live.discovery.isFetchNextPageError} fetching={live.discovery.isFetching} load={live.discovery.fetchNextPage} /> : null}
          {live?.discovery.isPending ? <ClanQueryState loading title="Finding clans…" /> : live?.discovery.isError ? <section className={styles.panel}><ClanQueryState title="Clans couldn't load." description="Your requests are safe. Retry to refresh the list." retry={() => live.discovery.isFetchNextPageError ? live.discovery.fetchNextPage() : live.discovery.refetch()} busy={live.discovery.isFetching} /></section> : live && !live.clans.length ? <section className={styles.panel}><ClanQueryState title="No clans found" description="Try another name or return when more clans are recruiting." /></section> : null}
        </motion.div>
      </DeferredMount>
    </div>
  );
}

function CaptainFounding({
  onCreate,
  onAddGroup,
  live,
}: {
  onCreate: (input: CreatedClan) => void;
  onAddGroup: () => void;
  live?: ClanRemote;
}) {
  const [selectedGroup, setSelectedGroup] = useState<ClanEligibleGroup | null>(null);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [motto, setMotto] = useState("Move together. Hold the line.");
  const [accent, setAccent] = useState<ClanSummary["accent"]>("cyan");
  const recreationNotice = live?.state.data?.qa_recreation_authorization_available === true
    ? <p role="status" className={styles.foundingIntro}>A one-time Captain recreation is available this Season. Choose a different eligible Telegram group. Successful registration uses this permission.</p> : null;

  const selectGroup = async (group: ClanEligibleGroup) => {
    let selected = group;
    if (live) {
      const verified = await live.run(`verify:${group.id}`, () => live.api.verifyGroup(Number(group.id)));
      if (!verified) return;
      selected = { ...group, title: verified.title, username: verified.username || null, photoUrl: verified.image_url === undefined ? group.photoUrl : verified.image_url, memberCount: verified.member_count === undefined ? group.memberCount : verified.member_count, botIsAdmin: true, userIsAdmin: true };
    }
    setSelectedGroup(selected);
    setName(selected.title);
    setTag(getIdentityInitials(selected.title).slice(0, 4));
  };

  const verifiedGroups: ClanEligibleGroup[] = live ? (live.groups.data ?? []).map(group => ({ id: String(group.id), title: group.title, username: group.username || null, memberCount: group.member_count ?? null, botIsAdmin: group.verification_state === "VERIFIED", userIsAdmin: group.verification_state === "VERIFIED", userIsOwner: false, photoUrl: group.image_url })) : eligibleClanGroups.filter(group => group.botIsAdmin && group.userIsAdmin);
  const valid = selectedGroup !== null && name.trim().length >= 3 && tag.trim().length >= 2;
  const preview: ClanSummary = {
    id: "preview",
    name: name.trim() || selectedGroup?.title || "Your Clan",
    tag: (tag.trim() || getIdentityInitials(selectedGroup?.title ?? "Your Clan")).slice(0, 4).toUpperCase(),
    level: 1,
    members: 1,
    capacity: 20,
    rank: 0,
    score: 0,
    status: "Recruiting",
    summary: motto.trim() || "Your clan motto will appear here.",
    accent,
    imageUrl: selectedGroup?.photoUrl ?? null,
  };

  if (!selectedGroup) {
    return (
      <div className={styles.stack}>
        <section className={styles.captainGuide}>
          <div className={styles.captainGuideArt}>
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}>
              <AssetImage assetKey={clanRoleArt.captain} />
            </motion.div>
          </div>
          <div>
            <span className={styles.eyebrow}>CAPTAIN REGISTRATION</span>
            <h2>Promote a verified group into your Clan HQ.</h2>
            <p>
              Captain is a seasonal leadership path. Choose a Telegram group already known to Dalexio where the bot is an admin and you have admin authority. We verify the group from backend data; you never need to enter a Chat ID manually.
            </p>
            {recreationNotice}
          </div>
        </section>

        <section className={styles.panel}>
          <SectionTitle eyebrow="VERIFIED TELEGRAM GROUPS" title="Choose your headquarters group" action={<span className={styles.sectionHint}>{verifiedGroups.length} eligible</span>} />
          <div className={styles.groupList}>
            {verifiedGroups.map((group) => {
              const hue = getIdentityHue(group.title);
              return (
                <button type="button" key={group.id} className={styles.groupCard} disabled={Boolean(live?.pending) || live?.groups.isError} onClick={() => void selectGroup(group)}>
                  <span className={styles.groupAvatar} style={{ "--identity-hue": hue } as CSSProperties}>
                    <AvatarContent owner={`clan-group:${group.id}`} photoUrl={group.photoUrl} fallback={getIdentityInitials(group.title)} />
                  </span>
                  <div>
                    <strong>{group.title}</strong>
                    <span>{group.memberCount === null ? "Member count unavailable" : `${group.memberCount.toLocaleString()} members`}{group.username ? ` · @${group.username}` : ""}</span>
                    <em>{live ? group.botIsAdmin && group.userIsAdmin ? "Verified" : "Verification required" : `Bot admin ✓ · ${group.userIsOwner ? "Owner verified" : "Admin verified"} ✓`}</em>
                  </div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.65} />
                </button>
              );
            })}
          </div>

          {live?.groups.isPending ? <ClanQueryState loading title="Finding your Telegram groups…" /> : live?.groups.isError ? <ClanQueryState title="Groups couldn't load." description="Retry after checking the bot's admin permissions." retry={() => live.groups.refetch()} busy={live.groups.isFetching} /> : live && !verifiedGroups.length ? <ClanQueryState title="No eligible groups yet" description="Add the bot as an admin, then refresh your groups." /> : null}
          <div className={styles.groupHelp}>
            <div><strong>Don't see your group?</strong><span>Add the Dalexio bot as an admin first, then return and refresh the eligible group list.</span></div>
            <Button type="button" tone="secondary" size="sm" className={styles.fullButton} onClick={onAddGroup}>
              Add Dalexio Bot to a group
            </Button>
            {live ? <Button type="button" tone="secondary" size="sm" disabled={live.groups.isFetching || live.pending !== null} onClick={() => void live.groups.refetch()}>Refresh groups</Button> : null}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <section className={`${styles.foundingScene} ${styles[accent]}`}>
        <div className={styles.sceneGlow} />
        <AssetImage assetKey="clan.hq.level1" className={styles.foundingHq} />
        <div className={styles.foundingIdentity}>
          <ClanEmblem clan={preview} size="md" />
          <div><span>STARTER HEADQUARTERS</span><strong>{preview.name}</strong><p>{preview.summary}</p></div>
        </div>
      </section>

      <section className={styles.selectedGroup}>
        <div className={styles.selectedGroupCopy}>
          <span>VERIFIED TELEGRAM HOME</span>
          <strong>{selectedGroup.title}</strong>
          <p>Bot admin verified · You are {selectedGroup.userIsOwner ? "the group owner" : "a verified group admin"}</p>
        </div>
        <button type="button" onClick={() => setSelectedGroup(null)}>Change</button>
      </section>

      <section className={styles.panel}>
        <SectionTitle eyebrow="CLAN IDENTITY" title="Finish the registration" />
        <p className={styles.foundingIntro}>The Telegram group remains the real home. These fields create the seasonal Clan identity shown inside Dexo Land.</p>
        {recreationNotice}
        <div className={styles.formGrid}>
          <label><span>Clan name</span><input value={name} maxLength={28} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>Tag</span><input value={tag} maxLength={4} onChange={(event) => setTag(event.target.value.toUpperCase())} /></label>
          <label className={styles.fullField}><span>Motto</span><input value={motto} maxLength={60} onChange={(event) => setMotto(event.target.value)} /></label>
        </div>

        <div className={styles.accentPicker}>
          <span>Identity tone</span>
          <div>
            {(["cyan", "violet", "gold", "blue"] as const).map((tone) => (
              <button key={tone} type="button" className={`${styles.accentButton} ${styles[tone]} ${accent === tone ? styles.accentActive : ""}`} aria-label={tone} onClick={() => setAccent(tone)} />
            ))}
          </div>
        </div>

        <Button
          type="button"
          tone="primary"
          size="md"
          className={`${styles.fullButton} ${styles.registerButton}`}
          trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.7} />}
          disabled={!valid || Boolean(live?.pending) || live?.groups.isError || live?.state.isError || live?.membership.isError}
          onClick={() => onCreate({
            name: name.trim(),
            tag: tag.trim().slice(0, 4).toUpperCase(),
            motto: motto.trim(),
            accent,
            telegramGroupId: selectedGroup.id,
            telegramGroupTitle: selectedGroup.title,
            telegramGroupUsername: selectedGroup.username,
            telegramGroupPhotoUrl: selectedGroup.photoUrl ?? null,
          })}
        >
          Register clan headquarters
        </Button>
      </section>
    </div>
  );
}

function TaskCard({ task }: { task: (typeof clanTasks)[number] }) {
  const ratio = Math.min(1, task.current / Math.max(1, task.target));
  return (
    <article className={`${styles.taskCard} ${task.status === "completed" ? styles.taskComplete : ""}`}>
      <div className={styles.taskSignal} style={{ "--task-progress": `${ratio * 360}deg` } as CSSProperties}>
        <span className={styles.taskSignalCore}>
          <b>{Math.round(ratio * 100)}%</b>
          <small>{task.status === "completed" ? "DONE" : task.type === "group" ? "SYNC" : "YOU"}</small>
        </span>
      </div>
      <div className={styles.taskBody}>
        <div className={styles.taskTop}>
          <span>{task.type === "group" ? "GROUP OP" : "PERSONAL OP"}</span>
          <em>{task.timeLabel}</em>
        </div>
        <strong>{task.title}</strong>
        <p>{task.description}</p>
        <div className={styles.taskProgress}>
          <div><span>{task.current} / {task.target} {task.unit}</span><strong title={task.rewardLabel}>{task.rewardLabel}</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
        </div>
      </div>
    </article>
  );
}

function ItemCard({
  item,
  quantity,
  shop = false,
  onOpen,
}: {
  item: ClanInventoryItem;
  quantity: number;
  shop?: boolean;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={styles.itemCard} onClick={onOpen}>
      <div className={styles.itemVisual}>
        <AssetImage assetKey={item.artKey} className={styles.itemImage} />
        {quantity > 0 ? <span className={styles.quantityBadge}>×{quantity}</span> : null}
      </div>
      <div className={styles.itemCopy}>
        <span>{item.kind} · {item.rarity}</span>
        <strong>{item.name}</strong>
        <p>{item.effect}</p>
        <em>{shop ? `${item.price.toLocaleString()} Treasury${quantity > 0 ? ` · Have ×${quantity}` : ""}` : `Inventory ×${quantity}`}</em>
      </div>
    </button>
  );
}

function Headquarters({
  clan,
  captain,
  treasury,
  ownedItemIds,
  activeEffects,
  applicants,
  onOpenItem,
  onOpenRequests,
  onOpenTrophies,
  live,
}: {
  clan: ClanSummary;
  captain: boolean;
  treasury: number;
  ownedItemIds: string[];
  activeEffects: ClanActiveEffect[];
  applicants: ClanJoinApplicant[];
  onOpenItem: (itemId: string, source: "inventory" | "shop") => void;
  onOpenRequests: () => void;
  onOpenTrophies: () => void;
  live?: ClanRemote;
}) {
  const [tab, setTab] = useState<HeadquartersTab>("home");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("active");
  const [inventoryMode, setInventoryMode] = useState<"owned" | "shop">("owned");
  const [hqClock, setHqClock] = useState(() => live?.serverNow() ?? Date.now());

  const serverNowRef = useRef(live?.serverNow ?? Date.now);
  serverNowRef.current = live?.serverNow ?? Date.now;
  useEffect(() => {
    const update = () => { if (!document.hidden) setHqClock(serverNowRef.current()); };
    update();
    const timer = window.setInterval(update, 1_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, []);
  const equipmentMetrics = live?.equipment.data ? clanEquipmentMetrics(live.equipment.data, live.serverNow()) : null;

  const itemDefinitions = live ? (live.equipment.data?.items ?? []).map(clanItem).filter((item): item is ClanInventoryItem => item !== null) : clanShopItems;
  const tasks: readonly ClanTask[] = live ? (live.missions.data ?? []).map(clanMission) : clanTasks;
  const achievements: readonly ClanAchievement[] = live ? (live.trophies.data ?? []).map(clanTrophy) : clanAchievements;
  const members: readonly ClanMember[] = live ? live.rosterRows.map(clanMember) : clanMembers;
  const pendingRequests = applicants.filter((applicant) => applicant.status === "pending").length;
  const itemQuantity = (itemId: string) => live ? live.equipment.data?.items.find(item => item.item_id === itemId)?.quantity ?? 0 : ownedItemIds.filter((ownedId) => ownedId === itemId).length;
  const ownedItems = itemDefinitions.filter((item) => itemQuantity(item.id) > 0);
  const shopGroups = (["Booster", "Defence", "Utility"] as const).map((kind) => ({
    kind,
    items: itemDefinitions.filter((item) => item.kind === kind),
  }));
  const totalOwnedItems = live ? (live.equipment.data?.items ?? []).reduce((total, item) => total + item.quantity, 0) : ownedItemIds.length;
  const home = live?.home.data;
  const levelProgress = home ? home.max_level ? 1 : home.next_threshold === null ? 0 : Math.min(1, home.progress_to_next / Math.max(1, home.next_threshold - home.current_threshold)) : clan.id === "captain-created" ? .42 : .68;
  const nextLevel = clan.level + 1;
  const hasRecoveryEffect = !live && activeEffects.some((effect) => effect.itemId === "supply-cache" && effect.endsAt > hqClock);
  const hqState: "normal" | "upgrade" | "recovery" | "max" = hasRecoveryEffect
    ? "recovery"
    : clan.hqState ?? "normal";
  const hqStateLabel = hqState === "upgrade" ? "UPGRADE READY" : hqState === "recovery" ? "RECOVERY MODE" : hqState === "max" ? "MAX LEVEL" : "ONLINE";
  const hqLoopSecond = Math.floor(hqClock / 1000) % 40;
  const showStatusArt = hqState !== "normal" && (Boolean(live) || hqLoopSecond < 10);
  const hqDisplayKey = showStatusArt ? getClanHqStateAssetKey(hqState, clan.level) : getClanHqStateAssetKey("normal", clan.level);
  const activeEffectCount = activeEffects.filter((effect) => effect.endsAt > hqClock).length;

  return (
    <div className={styles.stack}>
      <section className={`${styles.hqScene} ${styles[clan.accent]}`}>
        <div className={styles.sceneGlow} />
        <div className={styles.hqSceneTop}>
          <ClanEmblem clan={clan} size="md" />
          <div className={styles.hqIdentity}>
            <span>{captain ? "CAPTAIN HEADQUARTERS" : "YOUR CLAN HEADQUARTERS"}</span>
            <h2>{clan.name}</h2>
            <p>{clan.summary}</p>
          </div>
          <span className={styles.hqRank}>{clanRankLabel(clan.rank, clan.rankStatus)}</span>
        </div>

        <div className={styles.hqArtStage}>
          <motion.div
            className={styles.hqArtFloat}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              key={hqDisplayKey}
              initial={{ opacity: 0, scale: .985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: .45, ease: "easeOut" }}
              className={styles.hqArtSwap}
            >
              <AssetImage assetKey={hqDisplayKey} className={styles.hqArt} />
            </motion.div>
          </motion.div>
          <div className={styles.hqLevelPill}>HQ LVL {clan.level}</div>
          {showStatusArt ? <div className={`${styles.hqStatePill} ${styles[`hqState${hqState}`]}`}>{hqStateLabel}</div> : null}
        </div>

        <div className={styles.hqHud}>
          <div><span>Members</span><strong>{clan.members}<small>/{clan.capacity}</small></strong></div>
          <div><span>Treasury</span><strong>{treasury.toLocaleString()}</strong></div>
          <div><span>Season score</span><strong>{clan.score.toLocaleString()}</strong></div>
        </div>

        <div className={styles.hqProgress}>
          <div><span>{home?.max_level ? "Maximum HQ level" : `Progress to HQ Level ${nextLevel}`}</span><strong>{Math.round(levelProgress * 100)}%</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${levelProgress})` }} /></div>
        </div>
      </section>

      <ActiveEffectsStrip effects={activeEffects} serverNow={live?.serverNow} items={live ? itemDefinitions : undefined} />

      <nav className={styles.hqNav} aria-label="Clan headquarters sections">
        {(["home", "tasks", "members", "inventory"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? styles.hqNavActive : ""} onClick={() => setTab(item)}>
            {item === "home" ? "HQ" : item === "tasks" ? "Missions" : item === "members" ? "Roster" : "Inventory"}
          </button>
        ))}
      </nav>

      <DeferredMount minHeight={520}>
      <motion.div
          key={tab}
          className={styles.tabContent}
          initial={{ opacity: .96 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: .98 }}
          transition={mobileMotion.tab}
        >
          <RoomHero tab={tab} shop={tab === "inventory" && inventoryMode === "shop"} effects={equipmentMetrics?.effects ?? activeEffectCount} hqStateLabel={hqStateLabel} facilities={equipmentMetrics?.facilities} />

          {tab === "home" ? (
            <>
              {captain && (pendingRequests > 0 || live?.applicants.isPending || live?.applicants.isError) ? (
                <button type="button" className={styles.captainInbox} onClick={onOpenRequests}>
                  <div className={styles.inboxIcon}><HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.55} /></div>
                  <div><span>CAPTAIN INBOX</span><strong>{live?.applicants.isPending ? "Checking join requests…" : live?.applicants.isError ? "Join requests need refreshing" : `${pendingRequests} recruits waiting`}</strong><p>{live?.applicants.isError ? "Open your inbox to retry." : "Review them before the roster fills."}</p></div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.7} />
                </button>
              ) : null}

              {tasks.find(task => task.status === "active") ? <section className={styles.operationPanel}>
                <SectionTitle eyebrow="ACTIVE CLAN OPERATION" title={tasks.find(task => task.status === "active")!.title} />
                <TaskCard task={tasks.find(task => task.status === "active")!} />
              </section> : null}

              <section className={styles.commandRow}>
                <button type="button" onClick={() => setTab("inventory")}>
                  <span className={styles.commandArt}><AssetImage assetKey="clan.utilityHqUpgrade" /></span>
                  <div><span>PROGRESSION</span><strong>Next HQ upgrade</strong><p>{Math.round(levelProgress * 100)}% ready</p></div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
                </button>
                <div className={styles.rankPanel}>
                  <span>SEASON STANDING</span>
                  <strong>{clanRankLabel(clan.rank, clan.rankStatus)}</strong>
                  <p>{clan.score.toLocaleString()} clan score</p>
                </div>
              </section>

              <section className={styles.facilityRail} aria-label="Clan facilities">
                <article className={styles.facilityCard}>
                  <AssetImage assetKey="clan.treasuryReward" className={styles.facilityArt} />
                  <div><span>TREASURY</span><strong>{treasury.toLocaleString()} credits</strong><p>{home ? `Your contribution: ${home.own_contribution.toLocaleString()}` : "Shared resources ready for clan operations."}</p></div>
                </article>
                <button type="button" className={styles.facilityCard} onClick={onOpenTrophies}>
                  <AssetImage assetKey="clan.trophySymbol" className={styles.facilityArt} />
                  <div><span>TROPHY HALL</span><strong>{achievements.filter((achievement) => achievement.unlocked).length}/{achievements.length} honors</strong><p>Open the clan achievement archive.</p></div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
                </button>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="HEADQUARTERS LOG" title="Recent activity" />
                {live ? <ClanRecentActivity live={live} /> : <div className={styles.activityList}>
                  <article><span>12m</span><div><strong>Mira Vale +180 contribution</strong><p>Personal mission progress reached the clan.</p></div></article>
                  <article><span>1h</span><div><strong>Emergency Repair Kit stored</strong><p>A shared defence item entered the clan inventory.</p></div></article>
                  <article><span>3h</span><div><strong>Build the Relay reached 64%</strong><p>The next clan milestone moved closer.</p></div></article>
                </div>}
              </section>
            </>
          ) : null}

          {tab === "tasks" ? (
            <>
              <nav className={styles.filterNav}>
                <button type="button" className={taskFilter === "active" ? styles.filterActive : ""} onClick={() => setTaskFilter("active")}>Active</button>
                <button type="button" className={taskFilter === "completed" ? styles.filterActive : ""} onClick={() => setTaskFilter("completed")}>Completed</button>
              </nav>

              <section className={styles.panel}>
                <SectionTitle eyebrow="SHARED OPERATIONS" title="Clan missions" />
                <div className={styles.taskList}>
                  {tasks.filter((task) => task.type === "group" && task.status === taskFilter).map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="YOUR CONTRIBUTION" title="Personal missions" />
                <div className={styles.taskList}>
                  {tasks.filter((task) => task.type === "individual" && task.status === taskFilter).map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </section>
            </>
          ) : null}

          {tab === "members" ? (
            <section className={styles.panel}>
              <SectionTitle eyebrow="ACTIVE ROSTER" title={`${clan.members} / ${clan.capacity} positions`} action={<span className={styles.sectionHint}>Contribution order</span>} />
              <div className={styles.rosterLead}>
                <div><span>CLAN CAPACITY</span><strong>{clan.capacity - clan.members} slots open</strong></div>
                <div className={styles.progressTrack}><i style={{ transform: `scaleX(${Math.min(1, clan.members / clan.capacity)})` }} /></div>
              </div>
              <div className={styles.memberList} data-clan-roster>
                {members.map((member, index) => (
                  <article key={member.id}>
                    <span className={styles.memberRank}>#{index + 1}</span>
                    <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} captain={member.role === "Captain"} />
                    <div><strong>{member.name}</strong><span>Level {member.level ?? "—"} · {member.role}</span></div>
                    <b>{member.contribution.toLocaleString()}</b>
                  </article>
                ))}
              </div>
              {live ? <QueryContinuation selector="[data-clan-roster] > article:last-of-type" hasNext={live.roster.hasNextPage && !live.roster.isFetchNextPageError} fetching={live.roster.isFetching} load={live.roster.fetchNextPage} /> : null}
            </section>
          ) : null}

          {tab === "inventory" ? (
            <>
              {captain ? (
                <nav className={styles.filterNav}>
                  <button type="button" className={inventoryMode === "owned" ? styles.filterActive : ""} onClick={() => setInventoryMode("owned")}>Inventory</button>
                  <button type="button" className={inventoryMode === "shop" ? styles.filterActive : ""} onClick={() => setInventoryMode("shop")}>Shop</button>
                </nav>
              ) : null}

              {inventoryMode === "owned" || !captain ? (
                <section className={styles.panel}>
                  <SectionTitle eyebrow="SHARED LOADOUT" title="Clan Inventory" action={<span className={styles.sectionHint}>{totalOwnedItems} items · {ownedItems.length} types</span>} />
                  {ownedItems.length > 0 ? (
                    <div className={styles.itemGrid}>
                      {ownedItems.map((item) => <ItemCard key={item.id} item={item} quantity={itemQuantity(item.id)} onOpen={() => onOpenItem(item.id, "inventory")} />)}
                    </div>
                  ) : (
                    <div className={styles.inventoryEmpty}>
                      <strong>No shared items yet</strong>
                      <p>The clan inventory is empty. Buy equipment from the Shop and it will appear here for activation and use.</p>
                    </div>
                  )}
                </section>
              ) : (
                <section className={styles.panel}>
                  <SectionTitle eyebrow="CAPTAIN ARMORY" title="Spend Treasury" action={<span className={styles.treasuryChip}><HugeiconsIcon icon={Wallet01Icon} size={15} strokeWidth={1.65} /> {treasury.toLocaleString()}</span>} />
                  <p className={styles.shopIntro}>Items can be purchased repeatedly. Every purchase adds one unit to the shared Clan Inventory.</p>
                  <div className={styles.shopSections}>
                    {shopGroups.filter(group => !live || group.items.length > 0).map((group) => (
                      <section key={group.kind} className={styles.shopGroup}>
                        <div className={styles.shopGroupTitle}><span>{group.kind.toUpperCase()}</span><strong>{group.items.length} ITEMS</strong></div>
                        <div className={styles.itemGrid}>
                          {group.items.map((item) => <ItemCard key={item.id} item={item} quantity={itemQuantity(item.id)} shop onOpen={() => onOpenItem(item.id, "shop")} />)}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </motion.div>
      </DeferredMount>
    </div>
  );
}

function DemoClanPage() {
  const { level: earnLevel } = usePlayerProgression();
  const { bootstrap } = useBootstrap();
  const minLevel = isRemoteDataSource() ? bootstrap.data?.remote?.config.progression?.clan_min_level ?? 5 : 5;
  // This component is local diagnostics only; authenticated production uses RemoteClanPage.
  const clanAvailable = !isRemoteDataSource() && earnLevel >= minLevel;
  const clan = useClanStore();
  const { adapter } = useTelegram();
  const [overlay, setOverlay] = useState<OverlayState>(null);

  const activeClan = useMemo(() => {
    if (clan.activeClanId === "captain-created" && clan.createdClan) return buildCreatedClanSummary(clan.createdClan);
    return getClanById(clan.activeClanId);
  }, [clan.activeClanId, clan.createdClan]);

  const pageCopy = !clanAvailable
    ? { eyebrow: "CLAN NETWORK", title: "Your clan path waits ahead.", subtitle: `Reach Level ${minLevel} to unlock the social game layer.` }
    : clan.role === null
      ? { eyebrow: "CLAN NETWORK", title: "Choose your place in the season.", subtitle: "Lead one headquarters or earn your place inside one." }
      : clan.membership === "member" && activeClan
        ? { eyebrow: clan.role === "captain" ? "CAPTAIN COMMAND" : "CLAN NETWORK", title: activeClan.name, subtitle: clan.role === "captain" ? "Your headquarters is online." : "Your seasonal home is online." }
        : clan.role === "captain"
          ? { eyebrow: "CAPTAIN PATH", title: "Register your headquarters.", subtitle: "Promote a verified Telegram group into your seasonal clan home." }
          : { eyebrow: "SOLDIER PATH", title: "Find your seasonal home.", subtitle: "Compare active clans and keep one request in play." };

  const openClan = (clanId: string) => {
    adapter.selectionChanged();
    setOverlay({ type: "clan", clanId });
  };

  const chooseRole = (role: ClanRole) => {
    adapter.selectionChanged();
    setOverlay({ type: "role", role });
  };

  const confirmRole = (role: ClanRole) => {
    clan.chooseRole(role);
    adapter.hapticNotice("success");
    setOverlay(null);
  };

  const requestJoin = (clanId: string) => {
    clan.requestJoin(clanId);
    adapter.hapticNotice("success");
    setOverlay(null);
  };

  const purchaseItem = (item: ClanInventoryItem) => {
    const success = clan.purchaseItem(item.id, item.price);
    adapter.hapticNotice(success ? "success" : "warning");
    if (success) setOverlay(null);
  };

  const activateItem = (item: ClanInventoryItem) => {
    const success = clan.activateItem(item.id);
    adapter.hapticNotice(success ? "success" : "warning");
    if (success) setOverlay(null);
  };

  return (
    <>
      <main className={styles.page}>
        <header className={`${styles.pageHeader} ${clanAvailable && clan.membership === "member" ? styles.pageHeaderCompact : ""} ${clanAvailable && clan.role === null ? styles.pageHeaderWrap : ""}`}>
          <span>{pageCopy.eyebrow}</span>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.subtitle}</p>
        </header>

        {!clanAvailable ? <LockedClan level={earnLevel} minLevel={minLevel} /> : null}
        {clanAvailable && clan.role === null ? <RoleChoice onChoose={chooseRole} /> : null}

        {clanAvailable && clan.role === "soldier" && clan.membership !== "member" ? (
          <SoldierNetwork pendingClanId={clan.joinRequestClanId} requestState={clan.joinRequestState} onOpenClan={openClan} />
        ) : null}

        {clanAvailable && clan.role === "captain" && clan.membership !== "member" ? (
          <CaptainFounding
            onCreate={(input) => {
              clan.createClan(input);
              adapter.hapticNotice("success");
            }}
            onAddGroup={() => openClanBot(adapter)}
          />
        ) : null}

        {clanAvailable && clan.membership === "member" && activeClan ? (
          <Headquarters
            clan={activeClan}
            captain={clan.role === "captain"}
            treasury={clan.treasury}
            ownedItemIds={clan.ownedItemIds}
            activeEffects={clan.activeEffects}
            applicants={clan.applicants}
            onOpenItem={(itemId, source) => setOverlay({ type: "item", itemId, source })}
            onOpenRequests={() => setOverlay({ type: "requests" })}
            onOpenTrophies={() => setOverlay({ type: "trophies" })}
          />
        ) : null}

        <AnimatePresence>
          {clanAvailable && overlay?.type === "role" ? (
            <RoleConfirmSheet role={overlay.role} onClose={() => setOverlay(null)} onConfirm={() => confirmRole(overlay.role)} />
          ) : null}

          {clanAvailable && overlay?.type === "clan" ? (() => {
            const preview = getClanById(overlay.clanId);
            if (!preview) return null;
            return (
              <ClanPreviewSheet
                clan={preview}
                pendingClanId={clan.joinRequestState === "pending" ? clan.joinRequestClanId : null}
                onClose={() => setOverlay(null)}
                onJoin={() => requestJoin(preview.id)}
              />
            );
          })() : null}

          {clanAvailable && overlay?.type === "item" ? (() => {
            const item = getClanItemById(overlay.itemId);
            if (!item) return null;
            return (
              <ClanItemSheet
                item={item}
                quantity={clan.ownedItemIds.filter((ownedId) => ownedId === item.id).length}
                captain={clan.role === "captain"}
                treasury={clan.treasury}
                source={overlay.source}
                activeUntil={clan.activeEffects.find((effect) => effect.itemId === item.id && effect.endsAt > Date.now())?.endsAt ?? null}
                onClose={() => setOverlay(null)}
                onPurchase={() => purchaseItem(item)}
                onActivate={() => activateItem(item)}
              />
            );
          })() : null}

          {clanAvailable && overlay?.type === "trophies" ? (
            <ClanAchievementsSheet achievements={clanAchievements} onClose={() => setOverlay(null)} />
          ) : null}

          {clanAvailable && overlay?.type === "requests" ? (
            <JoinRequestsSheet
              applicants={clan.applicants}
              onClose={() => setOverlay(null)}
              onAccept={(id) => {
                clan.acceptApplicant(id);
                adapter.hapticNotice("success");
              }}
              onReject={(id) => {
                clan.rejectApplicant(id);
                adapter.hapticImpact("light");
              }}
            />
          ) : null}
        </AnimatePresence>
      </main>
    </>
  );
}

function RemoteClanPage() {
  const live = useClanRemote();
  const { level } = usePlayerProgression();
  const { adapter } = useTelegram();
  const [overlay, setOverlay] = useState<OverlayState | { type: "status" }>(null);
  const state = live.state.data;
  const minLevel = state?.unlock_level ?? 5;
  const role = state?.role === "CAPTAIN" ? "captain" : state?.role === "SOLDIER" ? "soldier" : null;
  const locked = state !== undefined ? state.enabled && !state.eligible && state.unlock_level !== null && level < state.unlock_level : !live.enabled && level < minLevel;
  const membershipReady = role === null || live.membership.data !== undefined;
  const ready = live.eligible && membershipReady;
  const initialError = live.membershipDenied || (!state && live.state.isError) || (Boolean(role) && live.membership.data === undefined && live.membership.isError) || Boolean(state?.role && !role) || Boolean(state && !locked && (!state.enabled || !state.eligible));
  const resolving = !locked && !initialError && (!ready || (role === "soldier" && !live.member && live.applicationProblem === "loading"));
  const member = ready && live.member;
  const identity = live.identity.data;
  const home = live.home.data;
  const hqReady = member && identity && home && live.equipment.data && live.trophies.data && live.missions.data && live.treasury.data && live.roster.data;
  const hqError = member && [live.identity, live.home, live.equipment, live.trophies, live.missions, live.treasury, live.roster].some(query => query.isError);
  const clan = identity && home ? { ...clanSummary(identity), accent: clanTone(live.scope.player, identity.id), rank: home.rank_status === "RANKED" ? home.rank ?? null : null, rankStatus: home.rank_status ?? "UNAVAILABLE", level: home.hq_level, members: home.used_capacity, capacity: home.effective_capacity, score: home.competitive_score, hqState: (home.state === "RECOVERY" || live.membership.data?.access_state === "ACCESS_LOST" ? "recovery" : home.max_level ? "max" : "normal") as ClanSummary["hqState"] } : null;
  const current = live.activeRequest;
  const hasRequest = current !== null;
  const effects: ClanActiveEffect[] = (live.equipment.data?.active_effects ?? []).filter(effect => effect.effective).map(effect => ({ id: String(effect.id), itemId: effect.item_id, startedAt: Date.parse(effect.starts_at), endsAt: Date.parse(effect.expires_at) }));
  const applicants = (live.applicants.data ?? []).map(clanApplicant);
  const destinationReady = !resolving && !initialError && (!member || Boolean(hqReady));
  const title = !destinationReady ? "Clan network" : locked ? "Your clan path waits ahead." : !state ? "Clan network" : member && clan ? clan.name : role === "captain" ? "Register your headquarters." : role === "soldier" ? "Find your seasonal home." : "Choose your place in the season.";
  const subtitle = !destinationReady ? "Your seasonal Clan connection." : locked ? `Reach Level ${minLevel} to unlock the social game layer.` : member ? "Your seasonal home is online." : role === "captain" ? "Promote a verified Telegram group into your seasonal clan home." : role === "soldier" ? "Compare active clans and keep one request in play." : "Lead one headquarters or earn your place inside one.";
  const openClan = (id: string) => { live.setPreviewId(Number(id)); setOverlay({ type: "clan", clanId: id }); adapter.selectionChanged(); };
  const close = () => { setOverlay(null); live.setPreviewId(null); };
  const after = async (action: string, operation: () => Promise<unknown>, next: OverlayState | { type: "status" } = null) => { if (await live.run(action, operation) !== undefined) setOverlay(next); };
  const itemRule = overlay?.type === "item" ? live.equipment.data?.items.find(item => item.item_id === overlay.itemId) : undefined;
  const item = itemRule ? clanItem(itemRule) : null;
  const purchaseAllowed = itemRule?.can_purchase === true && !live.equipment.isError && !live.membership.isError && !live.state.isError && !live.home.isError;
  const activationAllowed = itemRule?.can_activate === true && !live.equipment.isError && !live.membership.isError && !live.state.isError && !live.home.isError;
  const requestState = live.applicationProblem !== null ? "none" : hasRequest ? "pending" : live.lastHistoricalRequest?.state === "DECLINED" ? "rejected" : "none";
  return <main className={styles.page}>
    <header className={`${styles.pageHeader} ${member ? styles.pageHeaderCompact : ""} ${ready && !role ? styles.pageHeaderWrap : ""}`}>
      <div className={styles.headerTop}><span>{role === "captain" && member ? "CAPTAIN COMMAND" : "CLAN NETWORK"}</span>
      {ready && role ? <Button className={styles.statusButton} size="sm" tone="secondary" leadingIcon={<HugeiconsIcon icon={SquareActivityIcon} size={17} strokeWidth={1.8} />} onClick={() => setOverlay({ type: "status" })}>Clan status</Button> : null}</div><h1>{title}</h1><p>{subtitle}</p>
    </header>
    {locked ? <LockedClan level={level} minLevel={minLevel} /> : null}
    {resolving ? <section className={styles.panel}><ClanQueryState loading title="Connecting to your Clan…" /></section> : null}
    {initialError ? <section className={styles.panel}><ClanQueryState title="Clan couldn't load. Please try again." description="Your Clan progress is safe." retry={live.refresh} busy={live.state.isFetching || live.membership.isFetching} /></section> : null}
    {!initialError && !hqReady && state && (live.state.isError || live.membership.isError) ? <section className={styles.panel}><ClanQueryState title="Some Clan details couldn't refresh." description="Retry before taking another action." retry={live.refresh} busy={live.state.isFetching || live.membership.isFetching} /></section> : null}
    {destinationReady && ready && role === null && state?.role === null ? <RoleChoice disabled={live.pending !== null || live.state.isError || live.state.isFetching} onChoose={value => setOverlay({ type: "role", role: value })} /> : null}
    {destinationReady && ready && role === "soldier" && live.applicationProblem && live.applicationProblem !== "loading" ? <section className={styles.panel}><ClanQueryState title={applicationStatusMessage[live.applicationProblem]} retry={live.refresh} busy={live.requests.isFetching} /></section> : null}
    {destinationReady && ready && role === "soldier" && live.membership.data === null && live.applicationProblem !== "loading" && live.applicationProblem !== "error" ? <SoldierNetwork live={live} pendingClanId={hasRequest ? String(current.clan_id) : null} requestState={requestState} onOpenClan={openClan} /> : null}
    {destinationReady && ready && role === "captain" && live.membership.data === null ? <CaptainFounding live={live} onCreate={input => { void after("create", () => live.api.create({ telegram_group_id: Number(input.telegramGroupId), name: input.name, tag: input.tag, motto: input.motto }).then(value => { saveClanTone(live.scope.player, value.id, input.accent); return value; })); }} onAddGroup={() => openClanBot(adapter)} /> : null}
    {member && !hqReady ? <section className={styles.panel}><ClanQueryState loading={!hqError} title={hqError ? "Headquarters couldn't load fully." : "Preparing your headquarters…"} description={hqError ? "Retry to load your confirmed Clan details." : undefined} retry={hqError ? live.refresh : undefined} busy={live.home.isFetching} /></section> : null}
    {hqReady && (hqError || live.membership.isError || live.state.isError) ? <section className={styles.panel}><ClanQueryState title="Some Clan details couldn't refresh." description="Showing the last confirmed details." retry={live.refresh} busy={live.home.isFetching || live.membership.isFetching} /></section> : null}
    {hqReady && clan ? <Headquarters live={live} clan={clan} captain={live.membership.data?.role === "CAPTAIN"} treasury={home.treasury_balance} ownedItemIds={[]} activeEffects={effects} applicants={applicants} onOpenItem={(itemId, source) => setOverlay({ type: "item", itemId, source })} onOpenRequests={() => setOverlay({ type: "requests" })} onOpenTrophies={() => setOverlay({ type: "trophies" })} /> : null}
    <AnimatePresence>
      {overlay?.type === "role" ? <RoleConfirmSheet role={overlay.role} pending={live.pending !== null || live.state.isError} onClose={close} onConfirm={() => void after("role", () => live.api.role({ role: overlay.role === "captain" ? "CAPTAIN" : "SOLDIER" }))} /> : null}
      {overlay?.type === "clan" && live.preview.data ? <ClanPreviewSheet clan={clanSummary(live.preview.data)} pendingClanId={hasRequest ? String(current.clan_id) : null} pending={live.pending !== null || live.applicationsBlocked || Boolean(state?.cooldown_until && Date.parse(state.cooldown_until) > live.serverNow()) || Boolean(state && state.voluntary_leave_count >= state.max_voluntary_leaves)} onClose={close} onJoin={() => { if (!live.applicationsBlocked) void after("join", () => live.api.join(Number(overlay.clanId)), { type: "status" }); }} /> : overlay?.type === "clan" ? <ClanModal eyebrow="Clan preview" title="Clan preview" onClose={close}><ClanQueryState loading={!live.preview.isError} title={live.preview.isError ? "Clan couldn't load. Please try again." : "Preparing Clan preview…"} retry={live.preview.isError ? () => live.preview.refetch() : undefined} busy={live.preview.isFetching} /></ClanModal> : null}
      {overlay?.type === "requests" && member ? <JoinRequestsSheet applicants={applicants} loading={live.applicants.isPending} error={live.applicants.isError} retry={() => live.applicants.refetch()} fetching={live.applicants.isFetching} pendingAction={live.pending !== null || live.applicants.isError || live.membership.isError || live.state.isError} onClose={close} onAccept={id => void live.run(`accept:${id}`, () => live.api.decision(Number(id), { accept: true }))} onReject={id => void live.run(`reject:${id}`, () => live.api.decision(Number(id), { accept: false }))} /> : null}
      {overlay?.type === "item" && itemRule && item && home && member ? <ClanItemSheet item={item} quantity={itemRule.quantity} captain={live.membership.data?.role === "CAPTAIN"} treasury={home.treasury_balance} source={overlay.source} activeUntil={(live.equipment.data?.active_effects ?? []).filter(effect => effect.item_id === item.id && effect.effective).reduce<number | null>((last, effect) => Math.max(last ?? 0, Date.parse(effect.expires_at)), null)} purchaseAllowed={purchaseAllowed} activationAllowed={activationAllowed} pending={live.pending !== null} blockedLabel={clanItemBlockedLabel(itemRule.blocked_reason, overlay.source === "shop" && home.treasury_balance < itemRule.price)} onClose={close} onPurchase={() => { void live.economic("purchase", item.id).then(value => { if (value) close(); }); }} onActivate={() => { void live.economic("activate", item.id).then(value => { if (value) close(); }); }} /> : null}
      {overlay?.type === "trophies" && member ? <ClanAchievementsSheet achievements={(live.trophies.data ?? []).map(clanTrophy)} onClose={close} /> : null}
      {overlay?.type === "status" ? <ClanStatusSheet key={live.scopeKey} live={live} onClose={close} /> : null}
    </AnimatePresence>
  </main>;
}

export function ClanPage() {
  const { scope } = useBootstrap();
  return isRemoteDataSource() ? <RemoteClanPage key={JSON.stringify(scope)} /> : <DemoClanPage />;
}
