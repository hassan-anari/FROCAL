import type { ArenaPlayerRank, ArenaSeasonSummary, ArenaWarResultMeta, ArenaWarStatusMeta, ArenaWarStep } from "./types";

export const arenaSeason: ArenaSeasonSummary = {
  number: 1,
  name: "Founding Season",
  daysLeft: 21,
  progress: 0.42,
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
  { id: "victory", title: "Victory", subtitle: "Your clan controlled the battle and secured the seasonal win.", asset: "war.victory", scoreDelta: 620, reward: 2_400 },
  { id: "defeat", title: "Defeat", subtitle: "The rival clan finished stronger. Recovery begins immediately.", asset: "war.defeat", scoreDelta: -180, reward: 600 },
  { id: "draw", title: "Draw", subtitle: "Both clans closed the battle level. The seasonal score is shared.", asset: "war.draw", scoreDelta: 120, reward: 1_000 },
  { id: "successfulAttack", title: "Attack secured", subtitle: "The offensive objective was completed before the window closed.", asset: "war.successfulAttack", scoreDelta: 420, reward: 1_800 },
  { id: "successfulDefence", title: "Defence held", subtitle: "Your headquarters absorbed the attack and protected its standing.", asset: "war.successfulDefence", scoreDelta: 360, reward: 1_600 },
];

export const warStatuses: ArenaWarStatusMeta[] = [
  { id: "protection", title: "Protection active", subtitle: "The headquarters cannot be targeted while the protection window is online.", asset: "war.statusProtection", durationLabel: "02h 00m" },
  { id: "recovery", title: "Recovery mode", subtitle: "War systems are stabilizing before the clan can enter another conflict.", asset: "war.statusRecovery", durationLabel: "00h 45m" },
  { id: "reward", title: "Reward ready", subtitle: "The battle reward is sealed and ready for the clan Treasury.", asset: "war.statusReward", durationLabel: "READY" },
  { id: "debuff", title: "Temporary debuff", subtitle: "A short post-war penalty is affecting the next preparation window.", asset: "war.statusDebuff", durationLabel: "00h 30m" },
];

export const arenaWarfrontPreloadAssets = [
  "war.active",
  "war.matchmaking",
  "war.preparation",
  "war.defenceSetup",
] as const;

export const arenaWarDebugPreloadAssets = [
  "war.matchmaking",
  "war.opponent",
  "war.opponentPreview",
  "war.confirmation",
  "war.preparation",
  "war.itemSelection",
  "war.countdown",
  "war.active",
  "war.finalMoments",
  "war.defenceSetup",
  "war.victory",
  "war.defeat",
  "war.draw",
  "war.successfulAttack",
  "war.successfulDefence",
  "war.statusProtection",
  "war.statusRecovery",
  "war.statusReward",
  "war.statusDebuff",
] as const;

export const arenaRankingPreloadAssets = [
  "arena.rewardCapsule",
] as const;
