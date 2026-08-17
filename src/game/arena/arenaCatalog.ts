import type {
  ArenaPlayerRank,
  ArenaSeasonSummary,
  ArenaWarHistoryEntry,
  ArenaWarResultMeta,
  ArenaWarStatusMeta,
  ArenaWarStep,
  ArenaWarTask,
} from "./types";

export const arenaSeason: ArenaSeasonSummary = {
  number: 2,
  name: "Warfront Season",
  daysLeft: 48,
  progress: 0.18,
  playerScore: 8_420,
  playerRank: 247,
};

export const arenaPlayerRanking: ArenaPlayerRank[] = [
  { id: "p1", name: "Kael Orion", handle: "@kaelorion", level: 24, score: 48_920, rank: 1, clan: "Nova Vanguard", initials: "KO", accentHue: 191 },
  { id: "p2", name: "Mira Vale", handle: "@miravale", level: 22, score: 46_180, rank: 2, clan: "Ember Grid", initials: "MV", accentHue: 272 },
  { id: "p3", name: "Rin Sol", handle: "@rinsol", level: 21, score: 43_760, rank: 3, clan: "Aurora Unit", initials: "RS", accentHue: 38 },
  { id: "p4", name: "Tao Flux", handle: "@taoflux", level: 19, score: 39_640, rank: 4, clan: "Nova Vanguard", initials: "TF", accentHue: 156 },
  { id: "p5", name: "Iris Node", handle: "@irisnode", level: 18, score: 36_880, rank: 5, clan: "Signal Forge", initials: "IN", accentHue: 318 },
  { id: "p6", name: "Nox River", handle: "@noxriver", level: 18, score: 34_210, rank: 6, clan: null, initials: "NR", accentHue: 215 },
  { id: "p7", name: "Sena Arc", handle: "@senaarc", level: 17, score: 32_990, rank: 7, clan: "Ember Grid", initials: "SA", accentHue: 87 },
  { id: "p8", name: "Eli Quill", handle: "@eliquill", level: 17, score: 31_840, rank: 8, clan: "Aurora Unit", initials: "EQ", accentHue: 245 },
];

export const attackClanTasks: ArenaWarTask[] = [
  { id: "attack-relay", title: "Break the Relay", description: "Complete verified Typing Arena runs across the clan.", scope: "clan", current: 18, target: 24, unit: "runs", warPoints: 28 },
  { id: "attack-contribution", title: "Push the Line", description: "Generate verified clan contribution during the war window.", scope: "clan", current: 7_400, target: 10_000, unit: "contribution", warPoints: 30 },
  { id: "attack-active", title: "Full Formation", description: "Bring active members into the current war operation.", scope: "clan", current: 14, target: 18, unit: "members", warPoints: 22 },
  { id: "attack-sync", title: "Final Synchronization", description: "Close daily objectives before the rival clan does.", scope: "clan", current: 42, target: 50, unit: "objectives", warPoints: 20 },
];

export const attackPersonalTasks: ArenaWarTask[] = [
  { id: "personal-typing", title: "Run the Arena", description: "Finish 3 verified Typing Arena sessions.", scope: "personal", current: 2, target: 3, unit: "runs", warPoints: 8 },
  { id: "personal-contribution", title: "Add Your Weight", description: "Contribute 450 verified points to the clan effort.", scope: "personal", current: 310, target: 450, unit: "points", warPoints: 10 },
  { id: "personal-daily", title: "Hold Your Streak", description: "Complete 2 active daily missions during this war.", scope: "personal", current: 1, target: 2, unit: "missions", warPoints: 7 },
];

export const defenceClanTasks: ArenaWarTask[] = [
  { id: "defence-relay", title: "Hold the Relay", description: "Keep the clan relay online with verified activity.", scope: "clan", current: 21, target: 28, unit: "actions", warPoints: 28 },
  { id: "defence-repair", title: "Repair Cycle", description: "Complete recovery contributions before the attack window closes.", scope: "clan", current: 5_900, target: 8_000, unit: "repair", warPoints: 27 },
  { id: "defence-watch", title: "Watch Rotation", description: "Maintain a minimum active roster throughout the incoming attack.", scope: "clan", current: 15, target: 18, unit: "members", warPoints: 25 },
  { id: "defence-counter", title: "Counter Signal", description: "Finish coordinated objectives to suppress rival progress.", scope: "clan", current: 31, target: 40, unit: "objectives", warPoints: 20 },
];

export const defencePersonalTasks: ArenaWarTask[] = [
  { id: "defence-personal-typing", title: "Answer the Alert", description: "Complete 2 verified Typing Arena runs.", scope: "personal", current: 1, target: 2, unit: "runs", warPoints: 8 },
  { id: "defence-personal-contribution", title: "Reinforce HQ", description: "Add 350 contribution during the defence window.", scope: "personal", current: 220, target: 350, unit: "points", warPoints: 9 },
  { id: "defence-personal-mission", title: "Stay Online", description: "Finish one active personal mission before the timer ends.", scope: "personal", current: 0, target: 1, unit: "mission", warPoints: 7 },
];

export const arenaWarHistory: ArenaWarHistoryEntry[] = [
  { id: "w-104", opponentId: "ember-grid", direction: "attack", result: "victory", ourProgress: 100, enemyProgress: 86, durationLabel: "2h 18m", happenedLabel: "2 days ago", operationsCompleted: 4, operationsTotal: 4, mvp: "Mira Vale", reward: 2_400 },
  { id: "w-103", opponentId: "void-runners", direction: "defence", result: "victory", ourProgress: 94, enemyProgress: 78, durationLabel: "3h 06m", happenedLabel: "5 days ago", operationsCompleted: 4, operationsTotal: 4, mvp: "Kael North", reward: 1_900 },
  { id: "w-102", opponentId: "aurora-unit", direction: "attack", result: "defeat", ourProgress: 72, enemyProgress: 100, durationLabel: "4h 00m", happenedLabel: "8 days ago", operationsCompleted: 3, operationsTotal: 4, mvp: "Nova Reed", reward: 600 },
  { id: "w-101", opponentId: "ion-citadel", direction: "defence", result: "draw", ourProgress: 100, enemyProgress: 100, durationLabel: "2h 51m", happenedLabel: "11 days ago", operationsCompleted: 4, operationsTotal: 4, mvp: "Aria Moon", reward: 1_000 },
];

/* Previous internal War lab metadata remains exported for backwards-compatible debug files. */
export const warFlow: ArenaWarStep[] = [
  { id: "matchmaking", title: "Matchmaking", description: "Search the seasonal war pool for a compatible clan.", asset: "war.matchmaking" },
  { id: "opponent", title: "Opponent found", description: "Lock the rival clan selected by matchmaking.", asset: "war.opponent" },
  { id: "preview", title: "Opponent preview", description: "Review power, recent form and defensive profile.", asset: "war.opponentPreview" },
  { id: "confirm", title: "Match confirmation", description: "Confirm the war before preparation begins.", asset: "war.confirmation" },
  { id: "prepare", title: "Preparation", description: "Set the clan plan and prepare the shared loadout.", asset: "war.preparation" },
  { id: "items", title: "Item selection", description: "Choose eligible boosters and defensive resources.", asset: "war.itemSelection" },
  { id: "countdown", title: "Countdown", description: "Freeze the setup and synchronize the clan.", asset: "war.countdown" },
  { id: "battle", title: "Active battle", description: "Track live progress while clan activity resolves the war.", asset: "war.active" },
  { id: "final", title: "Final moments", description: "Show the closing state before the result is sealed.", asset: "war.finalMoments" },
  { id: "defence", title: "Defence setup", description: "Prepare protection for incoming attacks.", asset: "war.defenceSetup" },
];

export const warResults: ArenaWarResultMeta[] = [
  { id: "victory", title: "Victory", subtitle: "Your clan completed more operations and secured the seasonal win.", asset: "war.victory", scoreDelta: 620, reward: 2_400 },
  { id: "defeat", title: "Defeat", subtitle: "The rival clan completed the stronger war operation.", asset: "war.defeat", scoreDelta: -180, reward: 600 },
  { id: "draw", title: "Draw", subtitle: "Both clans closed the battle level. The seasonal score is shared.", asset: "war.draw", scoreDelta: 120, reward: 1_000 },
  { id: "successfulAttack", title: "Attack secured", subtitle: "The offensive objective was completed before the window closed.", asset: "war.successfulAttack", scoreDelta: 420, reward: 1_800 },
  { id: "successfulDefence", title: "Defence held", subtitle: "Your headquarters absorbed the attack and protected its standing.", asset: "war.successfulDefence", scoreDelta: 360, reward: 1_600 },
];

export const warStatuses: ArenaWarStatusMeta[] = [
  { id: "protection", title: "Protection active", subtitle: "Your headquarters cannot be challenged again while protection is online.", asset: "war.statusProtection", durationLabel: "03:42:18 remaining" },
  { id: "recovery", title: "Recovery mode", subtitle: "The headquarters is rebuilding after the last war operation.", asset: "war.statusRecovery", durationLabel: "01:18:42 remaining" },
  { id: "reward", title: "Reward ready", subtitle: "The completed war reward is ready for the clan to claim.", asset: "war.statusReward", durationLabel: "Ready now" },
  { id: "debuff", title: "Temporary debuff", subtitle: "A short post-war penalty is affecting the next operation window.", asset: "war.statusDebuff", durationLabel: "00:44:20 remaining" },
];

export const arenaOverviewPreloadAssets = ["war.active", "war.opponentPreview", "war.defenceSetup"] as const;
export const arenaWarPreloadAssets = ["war.active", "war.opponentPreview", "war.preparation", "war.itemSelection", "war.defenceSetup"] as const;
export const arenaHistoryPreloadAssets = ["war.victory", "war.defeat", "war.draw"] as const;
export const arenaRankingPreloadAssets = ["arena.rewardCapsule"] as const;

/* Backwards-compatible aliases. */
export const arenaWarfrontPreloadAssets = arenaOverviewPreloadAssets;
export const arenaWarDebugPreloadAssets = [
  "war.matchmaking", "war.opponent", "war.opponentPreview", "war.confirmation", "war.preparation", "war.itemSelection",
  "war.countdown", "war.active", "war.finalMoments", "war.defenceSetup", "war.victory", "war.defeat", "war.draw",
  "war.successfulAttack", "war.successfulDefence", "war.statusProtection", "war.statusRecovery", "war.statusReward", "war.statusDebuff",
] as const;
