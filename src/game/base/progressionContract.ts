export const S1_LEVEL_THRESHOLDS = [
  0,
  300,
  800,
  1500,
  2500,
  3800,
  5400,
  7300,
  9500,
  12000,
  14800,
  18000,
  21600,
  25600,
  30000,
  34900,
  40300,
  46200,
  52700,
  59800,
  67600,
  76200,
  85700,
  96200,
  108000,
  121500,
  137000,
  155000,
  176000,
  200000,
] as const;

export interface ProjectedProgression {
  level: number;
  currentThreshold: number;
  nextThreshold: number | null;
  pointsIntoLevel: number;
  levelSpan: number | null;
  progressRatio: number;
}

export function projectS1Progression(lifetimePoints: number): ProjectedProgression {
  const points = Math.max(0, Math.trunc(lifetimePoints));
  let index = 0;

  for (let candidate = 1; candidate < S1_LEVEL_THRESHOLDS.length; candidate += 1) {
    if (points < S1_LEVEL_THRESHOLDS[candidate]) break;
    index = candidate;
  }

  const currentThreshold = S1_LEVEL_THRESHOLDS[index];
  const nextThreshold = S1_LEVEL_THRESHOLDS[index + 1] ?? null;
  const pointsIntoLevel = points - currentThreshold;
  const levelSpan = nextThreshold === null ? null : nextThreshold - currentThreshold;

  return {
    level: index + 1,
    currentThreshold,
    nextThreshold,
    pointsIntoLevel,
    levelSpan,
    progressRatio:
      levelSpan === null ? 1 : Math.min(1, Math.max(0, pointsIntoLevel / levelSpan)),
  };
}
