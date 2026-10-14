import type { ProgressionPolicy } from "./model";

/** Only called with a validated server-authorized policy, never a client curve. */
export function authorizedProgression(lifetime: number, policy: ProgressionPolicy) {
  let index = 0;
  for (let next = 1; next < policy.levels.length && lifetime >= policy.levels[next].minimum; next++) index = next;
  const current = policy.levels[index];
  const next = policy.levels[index + 1];
  const stage = [...policy.stages].reverse().find((item) => current.level >= item.minimumLevel)!;
  return {
    level: current.level, stage: stage.key,
    pointsIntoLevel: lifetime - current.minimum,
    pointsToNextLevel: next ? next.minimum - lifetime : null,
    levelSpan: next ? next.minimum - current.minimum : null,
    nextThreshold: next?.minimum ?? null,
  };
}
