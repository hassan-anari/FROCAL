import {
  ArrowRight01Icon,
  UserCircleIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { preloadAssets } from "@/assets/preload";
import { AssetImage } from "@/design-system/components/AssetImage";
import { GameHeader } from "@/design-system/components/GameHeader";
import { GameShell } from "@/design-system/components/GameShell";
import { mobileMotion } from "@/design-system/motion/mobileMotion";
import { Button } from "@/design-system/primitives/Button";
import { usePauseBackgroundMotion } from "@/design-system/motion/usePauseBackgroundMotion";
import {
  CustomizeProfileSheet,
  ProfileDetailSheet,
  ShareProfileSheet,
  type ProfileDetailItem,
} from "@/features/profile/ProfileOverlays";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { useEarnStore } from "@/game/earn/earnStore";
import {
  achievementById,
  achievementDefinitions,
  frameById,
  medalById,
  medalDefinitions,
  profileTitles,
  titleById,
  visibleProfileFrames,
} from "@/game/profile/profileCatalog";
import { useProfileStore } from "@/game/profile/profileStore";
import type {
  AchievementCategory,
  AchievementId,
  CollectionTab,
  FrameId,
  MedalId,
  ProfileTab,
  TitleId,
} from "@/game/profile/types";
import { useScenarioStore } from "@/game/scenarios/scenarioStore";
import { loadBootstrap } from "@/integrations/api/bootstrap";
import { queryKeys } from "@/integrations/api/queryKeys";
import { useTelegram } from "@/integrations/telegram/TelegramProvider";
import styles from "./ProfilePage.module.css";

const profileTabKey = "dalexio-profile-active-tab";
const profileLink = "https://t.me/DalexioBot?start=dexoairdrop";

const profileTabs: Array<{ id: ProfileTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "achievements", label: "Achievements" },
  { id: "collection", label: "Collection" },
];

const achievementFilters: Array<{ id: "all" | AchievementCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "journey", label: "Journey" },
  { id: "community", label: "Community" },
  { id: "clan-war", label: "Clan & War" },
];

const collectionTabs: Array<{ id: CollectionTab; label: string }> = [
  { id: "frames", label: "Frames" },
  { id: "medals", label: "Medals" },
  { id: "titles", label: "Titles" },
];

function clampRatio(current: number, target: number): number {
  return Math.max(0, Math.min(1, current / Math.max(1, target)));
}

export function ProfilePage() {
  const scenario = useScenarioStore((state) => state.activeScenario);
  const { adapter } = useTelegram();
  const bootstrap = useQuery({
    queryKey: queryKeys.bootstrap(scenario),
    queryFn: () => loadBootstrap(scenario, adapter.platform),
  });
  const player = bootstrap.data?.player;
  const telegramUser = adapter.getUser();
  const firstName = telegramUser?.first_name ?? player?.firstName ?? "Explorer";
  const username = telegramUser?.username ?? player?.telegramUsername ?? null;
  const photoUrl = telegramUser?.photo_url ?? player?.avatarUrl ?? null;

  const earn = useEarnStore();
  const profile = useProfileStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => {
    const stored = sessionStorage.getItem(profileTabKey);
    return stored === "achievements" || stored === "collection" ? stored : "overview";
  });
  const [achievementFilter, setAchievementFilter] = useState<"all" | AchievementCategory>("all");
  const [collectionTab, setCollectionTab] = useState<CollectionTab>("frames");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<ProfileDetailItem | null>(null);
  usePauseBackgroundMotion(customizeOpen || shareOpen || detailItem !== null);

  const level = Math.max(earn.level, player?.level ?? 1);
  const lifetimeXp = Math.max(earn.lifetimeXp, player?.xp ?? 0);
  const levelRatio = clampRatio(earn.levelXp, earn.xpToNextLevel);
  const completedMissions = Math.max(
    1,
    Object.values(earn.missions).filter((mission) => mission.status === "completed" || mission.status === "claimed").length,
  );
  const displayStreak = Math.max(earn.streak, profile.achievementProgress["seven-day-streak"].current);
  const verifiedReferrals = Math.max(earn.verifiedReferrals, profile.achievementProgress["first-referral"].current);
  const activeFrame = frameById[profile.activeFrameId];
  const activeTitle = titleById[profile.activeTitleId];
  const featuredMedal = profile.featuredMedalId ? medalById[profile.featuredMedalId] : null;
  const featuredAchievement = profile.featuredAchievementId ? achievementById[profile.featuredAchievementId] : null;

  useEffect(() => {
    void preloadAssets([
      activeFrame.asset,
      "profile.cosmetic.achievementSlot",
      "profile.cosmetic.medalSlot",
    ]);
  }, [activeFrame.asset]);

  useEffect(() => {
    const mission = earn.missions["complete-profile"];
    if (mission.status === "in-progress") earn.completeMission("complete-profile");
  }, [earn]);

  const filteredAchievements = useMemo(
    () => achievementDefinitions.filter((achievement) => achievementFilter === "all" || achievement.category === achievementFilter),
    [achievementFilter],
  );

  const switchTab = (tab: ProfileTab) => {
    if (tab === activeTab) return;
    adapter.selectionChanged();
    setActiveTab(tab);
    sessionStorage.setItem(profileTabKey, tab);
  };

  const shareProfile = () => {
    const text = `${firstName} is exploring Dexo Land as ${activeTitle.name}. Level ${level} · ${lifetimeXp.toLocaleString()} lifetime XP.`;
    profile.incrementShareCount();
    adapter.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(profileLink)}&text=${encodeURIComponent(text)}`);
  };

  const copyProfileLink = async () => {
    await navigator.clipboard.writeText(profileLink);
    profile.incrementShareCount();
    adapter.hapticNotice("success");
  };

  const openAchievement = (id: AchievementId) => {
    const achievement = achievementById[id];
    const unlocked = profile.unlockedAchievementIds.includes(id);
    const progress = profile.achievementProgress[id];
    setDetailItem({
      kind: "achievement",
      name: achievement.name,
      description: achievement.description,
      asset: achievement.asset,
      unlocked,
      label: unlocked ? "Achievement unlocked" : achievement.availableNow ? "In progress" : "Future path",
      unlockHint: achievement.availableNow ? achievement.description : "Available when Clan, Defense and War systems open.",
      rewardXp: achievement.rewardXp,
      unlockedAt: profile.achievementUnlockDates[id],
      progress,
      primaryLabel: unlocked && profile.featuredAchievementId !== id ? "Feature achievement" : undefined,
      onPrimary: unlocked && profile.featuredAchievementId !== id ? () => {
        profile.setFeaturedAchievement(id);
        adapter.hapticNotice("success");
      } : undefined,
    });
  };

  const openFrame = (id: FrameId) => {
    const frame = frameById[id];
    const unlocked = profile.unlockedFrameIds.includes(id);
    setDetailItem({
      kind: "frame",
      name: frame.name,
      description: frame.description,
      asset: frame.asset,
      unlocked,
      label: profile.activeFrameId === id ? "Currently equipped" : unlocked ? `${frame.rarity} frame` : "Frame locked",
      unlockHint: frame.unlockHint,
      primaryLabel: unlocked && profile.activeFrameId !== id ? "Equip frame" : undefined,
      onPrimary: unlocked && profile.activeFrameId !== id ? () => {
        profile.setActiveFrame(id);
        adapter.hapticNotice("success");
      } : undefined,
    });
  };

  const openMedal = (id: MedalId) => {
    const medal = medalById[id];
    const unlocked = profile.unlockedMedalIds.includes(id);
    setDetailItem({
      kind: "medal",
      name: medal.name,
      description: medal.description,
      asset: medal.asset,
      unlocked,
      label: profile.featuredMedalId === id ? "Featured medal" : unlocked ? `${medal.rarity} medal` : "Medal locked",
      unlockHint: medal.unlockHint,
      primaryLabel: unlocked && profile.featuredMedalId !== id ? "Feature medal" : undefined,
      onPrimary: unlocked && profile.featuredMedalId !== id ? () => {
        profile.setFeaturedMedal(id);
        adapter.hapticNotice("success");
      } : undefined,
    });
  };

  const equipTitle = (id: TitleId) => {
    if (!profile.unlockedTitleIds.includes(id)) return;
    profile.setActiveTitle(id);
    adapter.hapticNotice("success");
  };

  return (
    <GameShell>
      <main className={styles.page}>
        <GameHeader />

        <header className={styles.pageHeader}>
          <span>PLAYER IDENTITY</span>
          <h1>Shape your legacy.</h1>
          <p>Manage your profile, achievements and the honors you choose to display.</p>
        </header>

        <nav className={styles.tabBar} aria-label="Profile sections">
          {profileTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? styles.tabActive : ""}
              onClick={() => switchTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeTab}
            className={styles.tabContent}
            initial={{ opacity: 0, x: 7 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={mobileMotion.tab}
          >
            {activeTab === "overview" ? (
              <div className={styles.stack}>
                <section className={styles.identityCard}>
                  <div className={styles.identityTop}>
                    <ProfileAvatar firstName={firstName} photoUrl={photoUrl} frameId={profile.activeFrameId} size="lg" />
                    <div className={styles.identityCopy}>
                      <span>SEASON ONE EXPLORER</span>
                      <h2>{firstName}</h2>
                      {username ? <small>@{username}</small> : null}
                      <strong className={styles.activeTitle}>{activeTitle.name}</strong>
                    </div>
                  </div>

                  <div className={styles.levelRow}>
                    <div><span>LEVEL {level}</span><strong>{earn.levelXp.toLocaleString()} / {earn.xpToNextLevel.toLocaleString()} XP</strong></div>
                    <div className={styles.levelTrack}><i style={{ transform: `scaleX(${levelRatio})` }} /></div>
                  </div>

                  <div className={styles.identityActions}>
                    <Button
                      type="button"
                      tone="secondary"
                      size="md"
                      className={styles.secondaryAction}
                      leadingIcon={<UserCircleIconView />}
                      onClick={() => setCustomizeOpen(true)}
                    >
                      Customize
                    </Button>
                    <Button
                      type="button"
                      tone="primary"
                      size="md"
                      className={styles.primaryAction}
                      trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.8} />}
                      onClick={() => setShareOpen(true)}
                    >
                      Share profile
                    </Button>
                  </div>
                </section>

                <section className={styles.summarySection}>
                  <header className={styles.sectionHeader}>
                    <div><span>PROGRESS</span><h2>Journey summary</h2></div>
                  </header>
                  <div className={styles.statGrid}>
                    <article><strong>{completedMissions}</strong><span>Missions</span></article>
                    <article><strong>{displayStreak}</strong><span>Day streak</span></article>
                    <article><strong>{verifiedReferrals}</strong><span>Referrals</span></article>
                    <article><strong>{lifetimeXp.toLocaleString()}</strong><span>Lifetime XP</span></article>
                  </div>
                </section>

                <section className={styles.connectionsSection}>
                  <header className={styles.sectionHeader}>
                    <div><span>CONNECTIONS</span><h2>Expand your profile</h2></div>
                  </header>
                  <div className={styles.connectionList}>
                    <article className={styles.connectionCard}>
                      <div className={styles.connectionIcon}><HugeiconsIcon icon={Wallet01Icon} size={21} strokeWidth={1.65} /></div>
                      <div className={styles.connectionCopy}>
                        <div><strong>Wallet</strong><span className={styles.comingSoon}>Coming soon</span></div>
                        <p>Wallet connection will be available in a future update.</p>
                      </div>
                    </article>

                    <article className={styles.connectionCard}>
                      <div className={styles.connectionIcon}><HugeiconsIcon icon={UserCircleIcon} size={21} strokeWidth={1.65} /></div>
                      <div className={styles.connectionCopy}>
                        <div><strong>Dalexio account</strong><span className={styles.comingSoon}>Coming soon</span></div>
                        <p>Dalexio account linking will be available in a future update.</p>
                      </div>
                    </article>
                  </div>
                </section>

                <section className={styles.showcaseSection}>
                  <header className={styles.sectionHeader}>
                    <div><span>SHOWCASE</span><h2>Featured honors</h2></div>
                    <button type="button" onClick={() => setCustomizeOpen(true)}>Edit</button>
                  </header>
                  <div className={styles.showcaseGrid}>
                    <button type="button" onClick={() => featuredMedal && openMedal(featuredMedal.id)}>
                      <div className={styles.showcaseSlot}>
                        <AssetImage assetKey="profile.cosmetic.medalSlot" className={styles.slotFrame} draggable={false} />
                        {featuredMedal ? <AssetImage assetKey={featuredMedal.asset} className={styles.slotItem} loading="lazy" draggable={false} /> : <span>—</span>}
                      </div>
                      <strong>{featuredMedal?.name ?? "No medal"}</strong>
                      <span>Featured medal</span>
                    </button>
                    <button type="button" onClick={() => featuredAchievement && openAchievement(featuredAchievement.id)}>
                      <div className={styles.showcaseSlot}>
                        <AssetImage assetKey="profile.cosmetic.achievementSlot" className={styles.slotFrame} draggable={false} />
                        {featuredAchievement ? <AssetImage assetKey={featuredAchievement.asset} className={styles.slotItem} loading="lazy" draggable={false} /> : <span>—</span>}
                      </div>
                      <strong>{featuredAchievement?.name ?? "No achievement"}</strong>
                      <span>Featured achievement</span>
                    </button>
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "achievements" ? (
              <section className={styles.achievementsSection}>
                <header className={styles.sectionIntro}>
                  <div><span>ACHIEVEMENTS</span><h2>Milestones that matter.</h2></div>
                  <strong>{profile.unlockedAchievementIds.length} / {achievementDefinitions.length}</strong>
                </header>
                <div className={styles.filterRail}>
                  {achievementFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={achievementFilter === filter.id ? styles.filterActive : ""}
                      onClick={() => { adapter.selectionChanged(); setAchievementFilter(filter.id); }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className={styles.achievementList}>
                  {filteredAchievements.map((achievement, index) => {
                    const unlocked = profile.unlockedAchievementIds.includes(achievement.id);
                    const progress = profile.achievementProgress[achievement.id];
                    const ratio = clampRatio(progress.current, progress.target);
                    return (
                      <motion.button
                        key={achievement.id}
                        type="button"
                        className={`${styles.achievementCard} ${unlocked ? styles.achievementUnlocked : ""}`}
                        onClick={() => openAchievement(achievement.id)}
                        initial={{ opacity: 0, y: 7 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...mobileMotion.reveal, delay: index * .018 }}
                      >
                        <div className={styles.achievementArt}>
                          <AssetImage assetKey={achievement.asset} loading="lazy" draggable={false} />
                          {unlocked ? null : <i>LOCKED</i>}
                        </div>
                        <div className={styles.achievementCopy}>
                          <div><span>{achievement.category.replace("-", " & ")}</span><em>{unlocked ? "Unlocked" : achievement.availableNow ? "In progress" : "Future path"}</em></div>
                          <h3>{achievement.name}</h3>
                          <p>{achievement.description}</p>
                          <div className={styles.achievementProgress}>
                            <div><span>{achievement.progressLabel}</span><strong>{progress.current} / {progress.target}</strong></div>
                            <div className={styles.progressTrack}><i style={{ transform: `scaleX(${ratio})` }} /></div>
                          </div>
                        </div>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.65} />
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {activeTab === "collection" ? (
              <section className={styles.collectionSection}>
                <header className={styles.sectionIntro}>
                  <div><span>COLLECTION</span><h2>Your profile inventory.</h2></div>
                  <strong>{profile.unlockedFrameIds.filter((id) => visibleProfileFrames.some((frame) => frame.id === id)).length + profile.unlockedMedalIds.length + profile.unlockedTitleIds.length} owned</strong>
                </header>
                <nav className={styles.collectionTabs} aria-label="Collection categories">
                  {collectionTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={collectionTab === tab.id ? styles.collectionActive : ""}
                      onClick={() => { adapter.selectionChanged(); setCollectionTab(tab.id); }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>

                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={collectionTab}
                    className={styles.collectionContent}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    transition={mobileMotion.tab}
                  >
                    {collectionTab === "frames" ? (
                      <div className={styles.collectionGrid}>
                        {visibleProfileFrames.map((frame) => {
                          const unlocked = profile.unlockedFrameIds.includes(frame.id);
                          const equipped = profile.activeFrameId === frame.id;
                          return (
                            <button key={frame.id} type="button" className={`${styles.collectionCard} ${equipped ? styles.equippedCard : ""}`} onClick={() => openFrame(frame.id)}>
                              <div className={styles.collectionArt}><AssetImage assetKey={frame.asset} loading="lazy" draggable={false} />{unlocked ? null : <span>LOCKED</span>}</div>
                              <div><strong>{frame.name}</strong><span>{equipped ? "Equipped" : unlocked ? frame.rarity : "Locked"}</span></div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {collectionTab === "medals" ? (
                      <div className={styles.medalGroups}>
                        {(["season", "career"] as const).map((group) => (
                          <section key={group}>
                            <header><span>{group === "season" ? "SEASON HONORS" : "CAREER MEDALS"}</span><strong>{medalDefinitions.filter((medal) => medal.group === group && profile.unlockedMedalIds.includes(medal.id)).length} unlocked</strong></header>
                            <div className={styles.collectionGrid}>
                              {medalDefinitions.filter((medal) => medal.group === group).map((medal) => {
                                const unlocked = profile.unlockedMedalIds.includes(medal.id);
                                const featured = profile.featuredMedalId === medal.id;
                                return (
                                  <button key={medal.id} type="button" className={`${styles.collectionCard} ${featured ? styles.equippedCard : ""}`} onClick={() => openMedal(medal.id)}>
                                    <div className={styles.collectionArt}><AssetImage assetKey={medal.asset} loading="lazy" draggable={false} />{unlocked ? null : <span>LOCKED</span>}</div>
                                    <div><strong>{medal.name}</strong><span>{featured ? "Featured" : unlocked ? medal.rarity : "Locked"}</span></div>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : null}

                    {collectionTab === "titles" ? (
                      <div className={styles.titleList}>
                        {profileTitles.map((title) => {
                          const unlocked = profile.unlockedTitleIds.includes(title.id);
                          const equipped = profile.activeTitleId === title.id;
                          return (
                            <button key={title.id} type="button" disabled={!unlocked} className={`${styles.titleCard} ${equipped ? styles.titleEquipped : ""}`} onClick={() => equipTitle(title.id)}>
                              <div className={styles.titleCardPlate}>
                                <AssetImage assetKey="profile.cosmetic.titlePlate" loading="lazy" draggable={false} />
                                <strong>{title.name}</strong>
                              </div>
                              <div><p>{title.description}</p><span>{equipped ? "Active title" : unlocked ? "Tap to equip" : title.unlockHint}</span></div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </section>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {customizeOpen ? (
          <CustomizeProfileSheet
            firstName={firstName}
            photoUrl={photoUrl}
            frameId={profile.activeFrameId}
            titleId={profile.activeTitleId}
            medalId={profile.featuredMedalId}
            achievementId={profile.featuredAchievementId}
            unlockedFrameIds={profile.unlockedFrameIds}
            unlockedTitleIds={profile.unlockedTitleIds}
            unlockedMedalIds={profile.unlockedMedalIds}
            unlockedAchievementIds={profile.unlockedAchievementIds}
            onClose={() => setCustomizeOpen(false)}
            onSave={(input) => {
              profile.applyCustomization(input);
              adapter.hapticNotice("success");
            }}
          />
        ) : null}
        {shareOpen ? (
          <ShareProfileSheet
            firstName={firstName}
            username={username}
            photoUrl={photoUrl}
            frameId={profile.activeFrameId}
            titleId={profile.activeTitleId}
            level={level}
            lifetimeXp={lifetimeXp}
            medalId={profile.featuredMedalId}
            achievementId={profile.featuredAchievementId}
            onClose={() => setShareOpen(false)}
            onShare={shareProfile}
            onCopy={copyProfileLink}
          />
        ) : null}
        {detailItem ? <ProfileDetailSheet item={detailItem} onClose={() => setDetailItem(null)} /> : null}
      </AnimatePresence>
    </GameShell>
  );
}

function UserCircleIconView() {
  return <HugeiconsIcon icon={UserCircleIcon} size={17} strokeWidth={1.7} />;
}
