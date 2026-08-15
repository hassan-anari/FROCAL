import {
  ArrowRight01Icon,
  InformationCircleIcon,
  Sword01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AssetImage } from "@/design-system/components/AssetImage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { Button } from "@/design-system/primitives/Button";
import {
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
import { clanRoleArt, getClanEmblemAssetKey, getClanHqAssetKey, getIdentityHue, getIdentityInitials } from "@/game/clan/clanVisuals";
import { useEarnStore } from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ClanPage.module.css";

type OverlayState =
  | { type: "role"; role: ClanRole }
  | { type: "clan"; clanId: string }
  | { type: "item"; itemId: string }
  | { type: "requests" }
  | null;

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
      <span>{avatarUrl ? <img src={avatarUrl} alt="" /> : getIdentityInitials(name)}</span>
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

function LockedClan({ level }: { level: number }) {
  const ratio = Math.min(1, level / 5);
  return (
    <div className={styles.stack}>
      <section className={styles.lockedScene}>
        <div className={styles.sceneGlow} />
        <AssetImage assetKey="clan.hq.stateLocked" className={styles.lockedArt} />
        <div className={styles.lockedCopy}>
          <span className={styles.eyebrow}>CLAN SYSTEM · LEVEL 5</span>
          <h2>Headquarters access locked</h2>
          <p>Grow your Dexo to Level 5, then choose one seasonal path: lead a clan or fight for one.</p>
        </div>
        <div className={styles.unlockProgress}>
          <div><span>Access progress</span><strong>LVL {level} / 5</strong></div>
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

function RoleChoice({ onChoose }: { onChoose: (role: ClanRole) => void }) {
  return (
    <div className={styles.stack}>
      <section className={styles.roleIntro}>
        <span className={styles.eyebrow}>SEASONAL CLAN PATH</span>
        <h2>Choose where you stand.</h2>
        <p>One role for the season. Captain builds the home. Soldier earns a place inside one.</p>
      </section>

      <section className={styles.roleGrid}>
        <button type="button" className={`${styles.roleCard} ${styles.captainCard}`} onClick={() => onChoose("captain")}>
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

        <button type="button" className={`${styles.roleCard} ${styles.soldierCard}`} onClick={() => onChoose("soldier")}>
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
        <span>LVL {clan.level} · {clan.members}/{clan.capacity} members · Rank #{clan.rank}</span>
        <div className={styles.miniMeta}>
          <span>{clan.status}</span>
          <span>{pending ? "Request pending" : `${clan.match ?? 80}% match`}</span>
        </div>
      </div>
      <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.6} />
    </button>
  );
}

function FeaturedClan({ clan, onOpen }: { clan: ClanSummary; onOpen: () => void }) {
  return (
    <button type="button" className={`${styles.featuredClan} ${styles[clan.accent]}`} onClick={onOpen}>
      <AssetImage assetKey={getClanHqAssetKey(clan.level)} className={styles.featuredHq} />
      <div className={styles.featuredShade} />
      <div className={styles.featuredTop}>
        <ClanEmblem clan={clan} size="md" />
        <span>#{clan.rank} SEASON</span>
      </div>
      <div className={styles.featuredCopy}>
        <span>RECOMMENDED · {clan.match ?? 90}% MATCH</span>
        <strong>{clan.name}</strong>
        <p>{clan.summary}</p>
        <em>{clan.members}/{clan.capacity} members · Level {clan.level} <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.7} /></em>
      </div>
    </button>
  );
}

function PendingJoinCard({ clan, rejected }: { clan: ClanSummary | null; rejected: boolean }) {
  if (!clan) return null;
  return (
    <section className={`${styles.requestState} ${rejected ? styles.requestRejected : ""}`}>
      <ClanEmblem clan={clan} size="sm" />
      <div>
        <span>{rejected ? "REQUEST CLOSED" : "REQUEST IN REVIEW"}</span>
        <strong>{clan.name}</strong>
        <p>{rejected ? "The slot stayed closed. You can search for another clan." : "Your only active request is waiting for Captain review."}</p>
      </div>
      <em>{rejected ? "Search unlocked" : "Pending"}</em>
    </section>
  );
}

function SoldierNetwork({
  pendingClanId,
  requestState,
  onOpenClan,
}: {
  pendingClanId: string | null;
  requestState: "none" | "pending" | "rejected";
  onOpenClan: (clanId: string) => void;
}) {
  const [tab, setTab] = useState<SoldierClanTab>("discover");
  const [query, setQuery] = useState("");

  const pendingClan = getClanById(pendingClanId);
  const suggested = suggestedClanIds
    .map((id) => getClanById(id))
    .filter((clan): clan is ClanSummary => clan !== null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clanCatalog;
    return clanCatalog.filter((clan) =>
      clan.name.toLowerCase().includes(normalized) || clan.tag.toLowerCase().includes(normalized),
    );
  }, [query]);

  const ranking = [...clanCatalog].sort((a, b) => a.rank - b.rank);
  const featured = suggested[0];

  return (
    <div className={styles.stack}>
      {requestState === "pending" ? <PendingJoinCard clan={pendingClan} rejected={false} /> : null}
      {requestState === "rejected" ? <PendingJoinCard clan={pendingClan} rejected /> : null}

      <nav className={styles.subnav} aria-label="Clan discovery sections">
        {(["discover", "search", "ranking"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? styles.subnavActive : ""} onClick={() => setTab(item)}>
            {item === "discover" ? "Discover" : item === "search" ? "Search" : "Ranking"}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={tab}
          className={styles.tabContent}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={mobileMotion.tab}
        >
          {tab === "discover" ? (
            <>
              {featured ? <FeaturedClan clan={featured} onOpen={() => onOpenClan(featured.id)} /> : null}
              <section className={styles.panel}>
                <SectionTitle eyebrow="OPEN RECRUITMENT" title="More clans for you" action={<span className={styles.sectionHint}>One request at a time</span>} />
                <div className={styles.clanList}>
                  {suggested.slice(1).map((clan) => (
                    <ClanCard key={clan.id} clan={clan} pendingClanId={pendingClanId} onOpen={() => onOpenClan(clan.id)} />
                  ))}
                </div>
              </section>

              <section className={styles.networkPulse}>
                <div><span>CLAN NETWORK</span><strong>{clanCatalog.length} active HQs</strong></div>
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
              <div className={styles.clanList}>
                {filtered.map((clan) => (
                  <ClanCard key={clan.id} clan={clan} pendingClanId={pendingClanId} onOpen={() => onOpenClan(clan.id)} />
                ))}
              </div>
            </section>
          ) : null}

          {tab === "ranking" ? (
            <section className={styles.panel}>
              <SectionTitle eyebrow="SEASON CLAN RANKING" title="Clan standings" />
              <div className={styles.podium}>
                {ranking.slice(0, 3).map((clan, index) => (
                  <button type="button" key={clan.id} onClick={() => onOpenClan(clan.id)}>
                    <em>#{index + 1}</em>
                    <ClanEmblem clan={clan} size="sm" />
                    <strong>{clan.name}</strong>
                    <span>{clan.score.toLocaleString()}</span>
                  </button>
                ))}
              </div>
              <div className={styles.rankingList}>
                {ranking.slice(3).map((clan) => (
                  <button type="button" key={clan.id} onClick={() => onOpenClan(clan.id)}>
                    <span>#{clan.rank}</span>
                    <ClanEmblem clan={clan} size="sm" />
                    <div><strong>{clan.name}</strong><em>Level {clan.level} · {clan.members}/{clan.capacity}</em></div>
                    <b>{clan.score.toLocaleString()}</b>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CaptainFounding({
  onCreate,
  onAddGroup,
}: {
  onCreate: (input: CreatedClan) => void;
  onAddGroup: () => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<ClanEligibleGroup | null>(null);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [motto, setMotto] = useState("Move together. Hold the line.");
  const [accent, setAccent] = useState<ClanSummary["accent"]>("cyan");

  const selectGroup = (group: ClanEligibleGroup) => {
    setSelectedGroup(group);
    setName(group.title);
    setTag(getIdentityInitials(group.title).slice(0, 4));
  };

  const verifiedGroups = eligibleClanGroups.filter((group) => group.botIsAdmin && group.userIsAdmin);
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
          </div>
        </section>

        <section className={styles.panel}>
          <SectionTitle eyebrow="VERIFIED TELEGRAM GROUPS" title="Choose your headquarters group" action={<span className={styles.sectionHint}>{verifiedGroups.length} eligible</span>} />
          <div className={styles.groupList}>
            {verifiedGroups.map((group) => {
              const hue = getIdentityHue(group.title);
              return (
                <button type="button" key={group.id} className={styles.groupCard} onClick={() => selectGroup(group)}>
                  <span className={styles.groupAvatar} style={{ "--identity-hue": hue } as CSSProperties}>
                    {group.photoUrl ? <img src={group.photoUrl} alt="" /> : getIdentityInitials(group.title)}
                  </span>
                  <div>
                    <strong>{group.title}</strong>
                    <span>{group.memberCount.toLocaleString()} members{group.username ? ` · @${group.username}` : ""}</span>
                    <em>Bot admin ✓ · {group.userIsOwner ? "Owner verified" : "Admin verified"} ✓</em>
                  </div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.65} />
                </button>
              );
            })}
          </div>

          <div className={styles.groupHelp}>
            <div><strong>Don't see your group?</strong><span>Add the Dalexio bot as an admin first, then return and refresh the eligible group list.</span></div>
            <Button type="button" tone="secondary" size="sm" className={styles.fullButton} onClick={onAddGroup}>
              Add Dalexio Bot to a group
            </Button>
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
          className={styles.fullButton}
          trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.7} />}
          disabled={!valid}
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
          <div><span>{task.current} / {task.target} {task.unit}</span><strong>{task.rewardLabel}</strong></div>
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
  applicants,
  onOpenItem,
  onOpenRequests,
}: {
  clan: ClanSummary;
  captain: boolean;
  treasury: number;
  ownedItemIds: string[];
  applicants: ClanJoinApplicant[];
  onOpenItem: (itemId: string) => void;
  onOpenRequests: () => void;
}) {
  const [tab, setTab] = useState<HeadquartersTab>("home");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("active");
  const [inventoryMode, setInventoryMode] = useState<"owned" | "shop">("owned");

  const pendingRequests = applicants.filter((applicant) => applicant.status === "pending").length;
  const itemQuantity = (itemId: string) => ownedItemIds.filter((ownedId) => ownedId === itemId).length;
  const ownedItems = clanShopItems.filter((item) => itemQuantity(item.id) > 0);
  const shopGroups = (["Booster", "Defence", "Utility"] as const).map((kind) => ({
    kind,
    items: clanShopItems.filter((item) => item.kind === kind),
  }));
  const totalOwnedItems = ownedItemIds.length;
  const levelProgress = clan.id === "captain-created" ? .42 : .68;
  const nextLevel = clan.level + 1;

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
          <span className={styles.hqRank}>#{clan.rank}</span>
        </div>

        <div className={styles.hqArtStage}>
          <motion.div
            className={styles.hqArtFloat}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <AssetImage assetKey={getClanHqAssetKey(clan.level)} className={styles.hqArt} />
          </motion.div>
          <div className={styles.hqLevelPill}>HQ LVL {clan.level}</div>
        </div>

        <div className={styles.hqHud}>
          <div><span>Members</span><strong>{clan.members}<small>/{clan.capacity}</small></strong></div>
          <div><span>Treasury</span><strong>{treasury.toLocaleString()}</strong></div>
          <div><span>Season score</span><strong>{clan.score.toLocaleString()}</strong></div>
        </div>

        <div className={styles.hqProgress}>
          <div><span>Progress to HQ Level {nextLevel}</span><strong>{Math.round(levelProgress * 100)}%</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${levelProgress})` }} /></div>
        </div>
      </section>

      <nav className={styles.hqNav} aria-label="Clan headquarters sections">
        {(["home", "tasks", "members", "inventory"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? styles.hqNavActive : ""} onClick={() => setTab(item)}>
            {item === "home" ? "HQ" : item === "tasks" ? "Missions" : item === "members" ? "Roster" : "Inventory"}
          </button>
        ))}
      </nav>

      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={tab}
          className={styles.tabContent}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={mobileMotion.tab}
        >
          {tab === "home" ? (
            <>
              {captain && pendingRequests > 0 ? (
                <button type="button" className={styles.captainInbox} onClick={onOpenRequests}>
                  <div className={styles.inboxIcon}><HugeiconsIcon icon={UserGroupIcon} size={24} strokeWidth={1.55} /></div>
                  <div><span>CAPTAIN INBOX</span><strong>{pendingRequests} recruits waiting</strong><p>Review them before the roster fills.</p></div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={17} strokeWidth={1.7} />
                </button>
              ) : null}

              <section className={styles.operationPanel}>
                <SectionTitle eyebrow="ACTIVE CLAN OPERATION" title="Build the Relay" action={<span className={styles.sectionHint}>2d 08h</span>} />
                <TaskCard task={clanTasks[0]} />
              </section>

              <section className={styles.commandRow}>
                <button type="button" onClick={() => setTab("inventory")}>
                  <span className={styles.commandArt}><AssetImage assetKey="clan.utilityHqUpgrade" /></span>
                  <div><span>PROGRESSION</span><strong>Next HQ upgrade</strong><p>{Math.round(levelProgress * 100)}% ready</p></div>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.7} />
                </button>
                <div className={styles.rankPanel}>
                  <span>SEASON STANDING</span>
                  <strong>#{clan.rank}</strong>
                  <p>{clan.score.toLocaleString()} clan score</p>
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="CLAN HONORS" title="Progress worth keeping" />
                <div className={styles.honorRail}>
                  {clanAchievements.map((achievement) => {
                    const ratio = Math.min(1, achievement.current / Math.max(1, achievement.target));
                    return (
                      <article key={achievement.id} className={achievement.unlocked ? styles.honorUnlocked : ""}>
                        <span className={styles.honorRing} style={{ "--honor-progress": `${ratio * 360}deg` } as CSSProperties}>
                          <i>{achievement.unlocked ? "✓" : Math.round(ratio * 100)}</i>
                        </span>
                        <strong>{achievement.name}</strong>
                        <small>{achievement.unlocked ? "Unlocked" : `${Math.round(ratio * 100)}%`}</small>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="HEADQUARTERS LOG" title="Recent activity" />
                <div className={styles.activityList}>
                  <article><span>12m</span><div><strong>Mira Vale +180 contribution</strong><p>Personal mission progress reached the clan.</p></div></article>
                  <article><span>1h</span><div><strong>Emergency Repair Kit stored</strong><p>A shared defence item entered the clan inventory.</p></div></article>
                  <article><span>3h</span><div><strong>Build the Relay reached 64%</strong><p>The next clan milestone moved closer.</p></div></article>
                </div>
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
                  {clanTasks.filter((task) => task.type === "group" && task.status === taskFilter).map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="YOUR CONTRIBUTION" title="Personal missions" />
                <div className={styles.taskList}>
                  {clanTasks.filter((task) => task.type === "individual" && task.status === taskFilter).map((task) => <TaskCard key={task.id} task={task} />)}
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
              <div className={styles.memberList}>
                {clanMembers.map((member, index) => (
                  <article key={member.id}>
                    <span className={styles.memberRank}>#{index + 1}</span>
                    <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} captain={member.role === "Captain"} />
                    <div><strong>{member.name}</strong><span>Level {member.level} · {member.role}</span></div>
                    <b>{member.contribution.toLocaleString()}</b>
                  </article>
                ))}
              </div>
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
                  <div className={styles.itemGrid}>
                    {ownedItems.map((item) => <ItemCard key={item.id} item={item} quantity={itemQuantity(item.id)} onOpen={() => onOpenItem(item.id)} />)}
                  </div>
                </section>
              ) : (
                <section className={styles.panel}>
                  <SectionTitle eyebrow="CAPTAIN ARMORY" title="Spend Treasury" action={<span className={styles.treasuryChip}><HugeiconsIcon icon={Wallet01Icon} size={15} strokeWidth={1.65} /> {treasury.toLocaleString()}</span>} />
                  <p className={styles.shopIntro}>Items can be purchased repeatedly. Every purchase adds one unit to the shared Clan Inventory.</p>
                  <div className={styles.shopSections}>
                    {shopGroups.map((group) => (
                      <section key={group.kind} className={styles.shopGroup}>
                        <div className={styles.shopGroupTitle}><span>{group.kind.toUpperCase()}</span><strong>{group.items.length} ITEMS</strong></div>
                        <div className={styles.itemGrid}>
                          {group.items.map((item) => <ItemCard key={item.id} item={item} quantity={itemQuantity(item.id)} shop onOpen={() => onOpenItem(item.id)} />)}
                        </div>
                      </section>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ClanPage() {
  const earnLevel = useEarnStore((state) => state.level);
  const clan = useClanStore();
  const { adapter } = useTelegram();
  const [overlay, setOverlay] = useState<OverlayState>(null);

  const activeClan = useMemo(() => {
    if (clan.activeClanId === "captain-created" && clan.createdClan) return buildCreatedClanSummary(clan.createdClan);
    return getClanById(clan.activeClanId);
  }, [clan.activeClanId, clan.createdClan]);

  const pageCopy = earnLevel < 5
    ? { eyebrow: "CLAN NETWORK", title: "Your clan path waits ahead.", subtitle: "Reach Level 5 to unlock the social game layer." }
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

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />

        <header className={`${styles.pageHeader} ${clan.membership === "member" ? styles.pageHeaderCompact : ""}`}>
          <span>{pageCopy.eyebrow}</span>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.subtitle}</p>
        </header>

        {earnLevel < 5 ? <LockedClan level={earnLevel} /> : null}
        {earnLevel >= 5 && clan.role === null ? <RoleChoice onChoose={chooseRole} /> : null}

        {earnLevel >= 5 && clan.role === "soldier" && clan.membership !== "member" ? (
          <SoldierNetwork pendingClanId={clan.joinRequestClanId} requestState={clan.joinRequestState} onOpenClan={openClan} />
        ) : null}

        {earnLevel >= 5 && clan.role === "captain" && clan.membership !== "member" ? (
          <CaptainFounding
            onCreate={(input) => {
              clan.createClan(input);
              adapter.hapticNotice("success");
            }}
            onAddGroup={() => adapter.openTelegramLink("https://t.me/DalexioBot?startgroup=dexoairdrop")}
          />
        ) : null}

        {earnLevel >= 5 && clan.membership === "member" && activeClan ? (
          <Headquarters
            clan={activeClan}
            captain={clan.role === "captain"}
            treasury={clan.treasury}
            ownedItemIds={clan.ownedItemIds}
            applicants={clan.applicants}
            onOpenItem={(itemId) => setOverlay({ type: "item", itemId })}
            onOpenRequests={() => setOverlay({ type: "requests" })}
          />
        ) : null}

        <AnimatePresence>
          {overlay?.type === "role" ? (
            <RoleConfirmSheet role={overlay.role} onClose={() => setOverlay(null)} onConfirm={() => confirmRole(overlay.role)} />
          ) : null}

          {overlay?.type === "clan" ? (() => {
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

          {overlay?.type === "item" ? (() => {
            const item = getClanItemById(overlay.itemId);
            if (!item) return null;
            return (
              <ClanItemSheet
                item={item}
                quantity={clan.ownedItemIds.filter((ownedId) => ownedId === item.id).length}
                captain={clan.role === "captain"}
                treasury={clan.treasury}
                onClose={() => setOverlay(null)}
                onPurchase={() => purchaseItem(item)}
              />
            );
          })() : null}

          {overlay?.type === "requests" ? (
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
    </GameShell>
  );
}
