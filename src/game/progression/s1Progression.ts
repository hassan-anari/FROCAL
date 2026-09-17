export type DexoStageKey =
  | "newborn"
  | "explorer"
  | "connector"
  | "specialist"
  | "vanguard"
  | "legend";

export interface ProgressionSnapshot {
  level: number;
  currentThreshold: number;
  nextThreshold: number | null;
  pointsIntoLevel: number;
  pointsToNextLevel: number | null;
  levelSpan: number | null;
  stage: DexoStageKey;
}

// Mirrors config/examples/season1.game-config.v1.json. Keep this table aligned with the
// published S1 backend contract; the backend remains authoritative for settled progression.
export const S1_LEVEL_THRESHOLDS = [
  0,
  300,
  800,
  1_500,
  2_500,
  3_800,
  5_400,
  7_300,
  9_500,
  12_000,
  14_800,
  18_000,
  21_600,
  25_600,
  30_000,
  34_900,
  40_300,
  46_200,
  52_700,
  59_800,
  67_600,
  76_200,
  85_700,
  96_200,
  108_000,
  121_500,
  137_000,
  155_000,
  176_000,
  200_000,
] as const;

export function stageForLevel(level: number): DexoStageKey {
  if (level >= 30) return "legend";
  if (level >= 20) return "vanguard";
  if (level >= 15) return "specialist";
  if (level >= 10) return "connector";
  if (level >= 5) return "explorer";
  return "newborn";
}

export function progressionForLifetime(lifetimePoints: number): ProgressionSnapshot {
  const normalized = Math.max(0, Math.trunc(lifetimePoints));
  let levelIndex = 0;

  for (let index = 1; index < S1_LEVEL_THRESHOLDS.length; index += 1) {
    if (normalized < S1_LEVEL_THRESHOLDS[index]) break;
    levelIndex = index;
  }

  const level = levelIndex + 1;
  const currentThreshold = S1_LEVEL_THRESHOLDS[levelIndex];
  const nextThreshold = S1_LEVEL_THRESHOLDS[levelIndex + 1] ?? null;
  const pointsIntoLevel = normalized - currentThreshold;
  const levelSpan = nextThreshold === null ? null : nextThreshold - currentThreshold;

  return {
    level,
    currentThreshold,
    nextThreshold,
    pointsIntoLevel,
    pointsToNextLevel: nextThreshold === null ? null : Math.max(0, nextThreshold - normalized),
    levelSpan,
    stage: stageForLevel(level),
  };
}
