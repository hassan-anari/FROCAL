import {
  ArrowRight01Icon,
  InformationCircleIcon,
  Sword01Icon,
  UserCircleIcon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
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
  clanMembers,
  clanShopItems,
  clanTasks,
  getClanById,
  getClanItemById,
  suggestedClanIds,
} from "@/game/clan/clanCatalog";
import { useClanStore } from "@/game/clan/clanStore";
import type {
  ClanInventoryItem,
  ClanJoinApplicant,
  ClanRole,
  ClanSummary,
  CreatedClan,
  HeadquartersTab,
  SoldierClanTab,
  TaskFilter,
} from "@/game/clan/types";
import { useEarnStore } from "@/game/earn/earnStore";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ClanPage.module.css";

type OverlayState =
  | { type: "role"; role: ClanRole }
  | { type: "clan"; clanId: string }
  | { type: "item"; itemId: string }
  | { type: "requests" }
  | null;

function ClanEmblem({ clan, size = "md" }: { clan: Pick<ClanSummary, "tag" | "accent">; size?: "sm" | "md" | "lg" }) {
  return <div className={`${styles.emblem} ${styles[clan.accent]} ${styles[`emblem${size}`]}`}><span>{clan.tag}</span></div>;
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
      <section className={`${styles.panel} ${styles.lockedHero}`}>
        <div className={styles.lockCore}><HugeiconsIcon icon={UserGroupIcon} size={42} strokeWidth={1.45} /></div>
        <span className={styles.eyebrow}>LEVEL 5 REQUIRED</span>
        <h2>Your clan path is still locked.</h2>
        <p>Reach Level 5 to choose your permanent role and enter the clan network.</p>
        <div className={styles.unlockProgress}>
          <div><span>Current level</span><strong>{level} / 5</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
        </div>
      </section>

      <section className={styles.panel}>
        <SectionTitle eyebrow="UNLOCKS AT LEVEL 5" title="What opens next" />
        <div className={styles.featureList}>
          <article><span><HugeiconsIcon icon={UserGroupIcon} size={19} strokeWidth={1.55} /></span><div><strong>Choose your path</strong><p>Commit once as Captain or Soldier.</p></div></article>
          <article><span><HugeiconsIcon icon={UserCircleIcon} size={19} strokeWidth={1.55} /></span><div><strong>Clan network</strong><p>Discover clans, request entry and build your place in the roster.</p></div></article>
          <article><span><HugeiconsIcon icon={Sword01Icon} size={19} strokeWidth={1.55} /></span><div><strong>Shared progression</strong><p>Group and individual tasks feed one Headquarters.</p></div></article>
        </div>
      </section>
    </div>
  );
}

function RoleChoice({ onChoose }: { onChoose: (role: ClanRole) => void }) {
  return (
    <div className={styles.stack}>
      <section className={`${styles.panel} ${styles.pathIntro}`}>
        <span className={styles.eyebrow}>ONE CHOICE · ONE PATH</span>
        <h2>Choose how you shape the clan world.</h2>
        <p>At Level 5 your clan role becomes permanent. Read both paths before you commit.</p>
      </section>

      <section className={styles.roleGrid}>
        <button type="button" className={`${styles.roleCard} ${styles.captainCard}`} onClick={() => onChoose("captain")}>
          <span className={styles.roleIcon}><HugeiconsIcon icon={UserGroupIcon} size={28} strokeWidth={1.55} /></span>
          <div>
            <span>LEADERSHIP PATH</span>
            <h3>Captain</h3>
            <p>Lead the clan, approve members and decide how Treasury is used. The clan's success will carry your decisions.</p>
          </div>
          <em>Choose Captain <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.7} /></em>
        </button>

        <button type="button" className={`${styles.roleCard} ${styles.soldierCard}`} onClick={() => onChoose("soldier")}>
          <span className={styles.roleIcon}><HugeiconsIcon icon={UserCircleIcon} size={28} strokeWidth={1.55} /></span>
          <div>
            <span>CONTRIBUTION PATH</span>
            <h3>Soldier</h3>
            <p>Your actions can change the game. Missions, consistency and contribution move the whole clan forward.</p>
          </div>
          <em>Choose Soldier <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.7} /></em>
        </button>
      </section>

      <div className={styles.choiceNote}>
        <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={1.55} />
        <span>This frontend intentionally has no role-switch setting after confirmation.</span>
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
          {clan.fresh ? <em>NEW ACTIVE</em> : null}
        </div>
        <span>#{clan.rank} · LVL {clan.level} · {clan.members}/{clan.capacity} members</span>
        <div className={styles.miniMeta}>
          <span>{clan.status}</span>
          <span>{pending ? "Request pending" : `${clan.match ?? 80}% match`}</span>
        </div>
      </div>
      <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.6} />
    </button>
  );
}

function PendingJoinCard({
  clan,
  rejected,
}: {
  clan: ClanSummary | null;
  rejected: boolean;
}) {
  if (!clan) return null;
  return (
    <section className={`${styles.requestState} ${rejected ? styles.requestRejected : ""}`}>
      <span>{rejected ? "REQUEST CLOSED" : "JOIN REQUEST SENT"}</span>
      <div>
        <ClanEmblem clan={clan} size="sm" />
        <div>
          <strong>{clan.name}</strong>
          <p>{rejected ? "This request was not accepted. You can choose another clan." : "Waiting for the Captain to review your request. You cannot send another request while this one is active."}</p>
        </div>
      </div>
      <em>{rejected ? "Ready to search again" : "Pending Captain approval"}</em>
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
      clan.name.toLowerCase().includes(normalized) ||
      clan.tag.toLowerCase().includes(normalized),
    );
  }, [query]);

  const ranking = [...clanCatalog].sort((a, b) => a.rank - b.rank);

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
              <section className={styles.panel}>
                <SectionTitle eyebrow="MATCHED FOR YOU" title="Suggested clans" action={<span className={styles.sectionHint}>Fresh & active</span>} />
                <div className={styles.clanList}>
                  {suggested.map((clan) => (
                    <ClanCard key={clan.id} clan={clan} pendingClanId={pendingClanId} onOpen={() => onOpenClan(clan.id)} />
                  ))}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="NETWORK SNAPSHOT" title="Rising this week" />
                <div className={styles.risingGrid}>
                  {clanCatalog.slice(3, 6).map((clan) => (
                    <button type="button" key={clan.id} onClick={() => onOpenClan(clan.id)}>
                      <ClanEmblem clan={clan} size="sm" />
                      <strong>{clan.name}</strong>
                      <span>#{clan.rank} · {clan.score.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {tab === "search" ? (
            <section className={styles.panel}>
              <SectionTitle eyebrow="FIND A CLAN" title="Search the network" />
              <label className={styles.searchBox}>
                <span>Search by clan name or tag</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Nova or NVG" />
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
              <SectionTitle eyebrow="SEASON CLAN RANKING" title="Leaderboard" />
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

function CaptainFounding({ onCreate }: { onCreate: (input: { name: string; tag: string; motto: string; accent: ClanSummary["accent"] }) => void }) {
  const [name, setName] = useState("Aegis Prime");
  const [tag, setTag] = useState("AGS");
  const [motto, setMotto] = useState("Move together. Hold the line.");
  const [accent, setAccent] = useState<ClanSummary["accent"]>("cyan");
  const valid = name.trim().length >= 3 && tag.trim().length >= 2;

  const preview: ClanSummary = {
    id: "preview",
    name: name.trim() || "Your Clan",
    tag: (tag.trim() || "TAG").slice(0, 4).toUpperCase(),
    level: 1,
    members: 1,
    capacity: 20,
    rank: 0,
    score: 0,
    status: "Recruiting",
    summary: motto.trim() || "Your clan motto will appear here.",
    accent,
  };

  return (
    <div className={styles.stack}>
      <section className={`${styles.panel} ${styles.foundingHero}`}>
        <span className={styles.eyebrow}>CAPTAIN PATH</span>
        <h2>Found your headquarters.</h2>
        <p>Create the identity your members will rally around. Backend rules come later; this flow is frontend-only.</p>
      </section>

      <section className={styles.panel}>
        <SectionTitle eyebrow="LIVE CLAN IDENTITY" title="Founding setup" />
        <div className={styles.foundingPreview}>
          <ClanEmblem clan={preview} size="lg" />
          <div><span>FOUNDING CLAN</span><strong>{preview.name}</strong><p>{preview.summary}</p></div>
        </div>

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
          onClick={() => onCreate({ name: name.trim(), tag: tag.trim().slice(0, 4).toUpperCase(), motto: motto.trim(), accent })}
        >
          Found clan
        </Button>
      </section>
    </div>
  );
}

function TaskCard({ task }: { task: (typeof clanTasks)[number] }) {
  const ratio = Math.min(1, task.current / Math.max(1, task.target));
  return (
    <article className={`${styles.taskCard} ${task.status === "completed" ? styles.taskComplete : ""}`}>
      <div className={styles.taskTop}>
        <span>{task.type === "group" ? "GROUP" : "INDIVIDUAL"}</span>
        <em>{task.timeLabel}</em>
      </div>
      <strong>{task.title}</strong>
      <p>{task.description}</p>
      <div className={styles.taskProgress}>
        <div><span>{task.current} / {task.target} {task.unit}</span><strong>{Math.round(ratio * 100)}%</strong></div>
        <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
      </div>
      <footer><span>{task.rewardLabel}</span><em>{task.status === "completed" ? "Completed" : "Active"}</em></footer>
    </article>
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
  const ownedItems = clanShopItems.filter((item) => ownedItemIds.includes(item.id));
  const shopItems = clanShopItems.filter((item) => !ownedItemIds.includes(item.id));
  const levelProgress = clan.id === "captain-created" ? .42 : .68;

  return (
    <div className={styles.stack}>
      <section className={`${styles.panel} ${styles.hqHero}`}>
        <div className={styles.hqTop}>
          <ClanEmblem clan={clan} size="lg" />
          <div className={styles.hqIdentity}>
            <span>CLAN HEADQUARTERS</span>
            <h2>{clan.name}</h2>
            <p>{clan.summary}</p>
          </div>
          <span className={styles.hqRank}>#{clan.rank}</span>
        </div>
        <div className={styles.hqBadgeRow}>
          <span>{clan.status}</span>
          <span>{clan.score.toLocaleString()} clan score</span>
        </div>
        <div className={styles.hqProgress}>
          <div><span>Clan Level {clan.level}</span><strong>{Math.round(levelProgress * 100)}%</strong></div>
          <div className={styles.progressTrack}><i style={{ transform: `scaleX(${levelProgress})` }} /></div>
        </div>
        <div className={styles.hqStats}>
          <div><span>Members</span><strong>{clan.members}/{clan.capacity}</strong></div>
          <div><span>Treasury</span><strong>{treasury.toLocaleString()}</strong></div>
          <div><span>Rank</span><strong>#{clan.rank}</strong></div>
        </div>
      </section>

      <nav className={styles.hqNav} aria-label="Clan headquarters sections">
        {(["home", "tasks", "members", "inventory"] as const).map((item) => (
          <button key={item} type="button" className={tab === item ? styles.hqNavActive : ""} onClick={() => setTab(item)}>
            {item === "home" ? "Home" : item === "tasks" ? "Tasks" : item === "members" ? "Members" : "Inventory"}
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
              {captain ? (
                <section className={styles.captainCallout}>
                  <div><span>CAPTAIN INBOX</span><strong>{pendingRequests} join requests waiting</strong><p>Review explorers before opening the roster.</p></div>
                  <button type="button" onClick={onOpenRequests}>Manage <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={1.7} /></button>
                </section>
              ) : null}

              <section className={styles.panel}>
                <SectionTitle eyebrow="CURRENT OBJECTIVE" title="Clan momentum" />
                <TaskCard task={clanTasks[0]} />
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="SEASON STANDING" title="Clan Leaderboard" action={<span className={styles.sectionHint}>Current rank #{clan.rank}</span>} />
                <div className={styles.hqLeaderboard}>
                  {[...clanCatalog].sort((a, b) => a.rank - b.rank).slice(0, 3).map((ranked) => (
                    <div key={ranked.id}>
                      <span>#{ranked.rank}</span>
                      <ClanEmblem clan={ranked} size="sm" />
                      <strong>{ranked.name}</strong>
                      <b>{ranked.score.toLocaleString()}</b>
                    </div>
                  ))}
                  {clan.rank > 3 ? (
                    <div className={styles.currentClanRank}>
                      <span>#{clan.rank}</span>
                      <ClanEmblem clan={clan} size="sm" />
                      <strong>{clan.name}</strong>
                      <b>{clan.score.toLocaleString()}</b>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="CLAN HONORS" title="Achievements" />
                <div className={styles.achievementGrid}>
                  {clanAchievements.map((achievement) => {
                    const ratio = Math.min(1, achievement.current / Math.max(1, achievement.target));
                    return (
                      <article key={achievement.id} className={achievement.unlocked ? styles.achievementUnlocked : ""}>
                        <span>{achievement.unlocked ? "UNLOCKED" : `${Math.round(ratio * 100)}%`}</span>
                        <strong>{achievement.name}</strong>
                        <p>{achievement.description}</p>
                        <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="RECENT CLAN ACTIVITY" title="Headquarters log" />
                <div className={styles.activityList}>
                  <article><span>12m</span><div><strong>Mira Vale added 180 contribution</strong><p>Individual task progress moved forward.</p></div></article>
                  <article><span>1h</span><div><strong>Supply Cache added to Inventory</strong><p>Captain purchase recorded in the shared clan log.</p></div></article>
                  <article><span>3h</span><div><strong>Group Task reached 64%</strong><p>Build the Relay continues to advance.</p></div></article>
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
                <SectionTitle eyebrow="SHARED OBJECTIVES" title="Group Tasks" />
                <div className={styles.taskList}>
                  {clanTasks.filter((task) => task.type === "group" && task.status === taskFilter).map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </section>

              <section className={styles.panel}>
                <SectionTitle eyebrow="YOUR CONTRIBUTION" title="Individual Tasks" />
                <div className={styles.taskList}>
                  {clanTasks.filter((task) => task.type === "individual" && task.status === taskFilter).map((task) => <TaskCard key={task.id} task={task} />)}
                </div>
              </section>
            </>
          ) : null}

          {tab === "members" ? (
            <section className={styles.panel}>
              <SectionTitle eyebrow="CLAN ROSTER" title={`${clan.members} members`} action={<span className={styles.sectionHint}>Contribution ranked</span>} />
              <div className={styles.memberList}>
                {clanMembers.map((member, index) => (
                  <article key={member.id}>
                    <span className={styles.memberRank}>#{index + 1}</span>
                    <div className={styles.memberAvatar}>{member.initial}</div>
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
                  <SectionTitle eyebrow="SHARED ITEMS" title="Clan Inventory" action={<span className={styles.sectionHint}>{ownedItems.length} owned</span>} />
                  <div className={styles.itemGrid}>
                    {ownedItems.map((item) => (
                      <button type="button" key={item.id} onClick={() => onOpenItem(item.id)}>
                        <span className={styles.itemGlyph}>{item.glyph}</span>
                        <strong>{item.name}</strong>
                        <em>{item.rarity}</em>
                        <p>{item.effect}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <section className={styles.panel}>
                  <SectionTitle eyebrow="CAPTAIN SHOP" title="Spend Treasury" action={<span className={styles.treasuryChip}><HugeiconsIcon icon={Wallet01Icon} size={14} strokeWidth={1.65} /> {treasury.toLocaleString()}</span>} />
                  <div className={styles.shopIntro}>Purchases are mocked for frontend review. Final Treasury rules will be connected with the backend later.</div>
                  <div className={styles.itemGrid}>
                    {shopItems.map((item) => (
                      <button type="button" key={item.id} onClick={() => onOpenItem(item.id)}>
                        <span className={styles.itemGlyph}>{item.glyph}</span>
                        <strong>{item.name}</strong>
                        <em>{item.price.toLocaleString()} Treasury</em>
                        <p>{item.effect}</p>
                      </button>
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
    ? { eyebrow: "CLAN NETWORK", title: "Build together.", subtitle: "Reach Level 5 to unlock your permanent clan path." }
    : clan.role === null
      ? { eyebrow: "CLAN NETWORK", title: "Choose your path.", subtitle: "Captain or Soldier — one permanent decision shapes what comes next." }
      : clan.membership === "member" && activeClan
        ? { eyebrow: clan.role === "captain" ? "CAPTAIN COMMAND" : "CLAN NETWORK", title: "Your headquarters.", subtitle: "Progress, members, tasks, Treasury and shared clan resources in one place." }
        : clan.role === "captain"
          ? { eyebrow: "CAPTAIN PATH", title: "Found your clan.", subtitle: "Create the headquarters you will lead." }
          : { eyebrow: "SOLDIER PATH", title: "Find your clan.", subtitle: "Search, compare and send one active request at a time." };

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

        <header className={styles.pageHeader}>
          <span>{pageCopy.eyebrow}</span>
          <h1>{pageCopy.title}</h1>
          <p>{pageCopy.subtitle}</p>
        </header>

        {earnLevel < 5 ? <LockedClan level={earnLevel} /> : null}
        {earnLevel >= 5 && clan.role === null ? <RoleChoice onChoose={chooseRole} /> : null}

        {earnLevel >= 5 && clan.role === "soldier" && clan.membership !== "member" ? (
          <SoldierNetwork
            pendingClanId={clan.joinRequestClanId}
            requestState={clan.joinRequestState}
            onOpenClan={openClan}
          />
        ) : null}

        {earnLevel >= 5 && clan.role === "captain" && clan.membership !== "member" ? (
          <CaptainFounding
            onCreate={(input) => {
              clan.createClan(input);
              adapter.hapticNotice("success");
            }}
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
                owned={clan.ownedItemIds.includes(item.id)}
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
