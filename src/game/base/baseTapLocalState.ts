export const BASE_TAP_STATE_EVENT = "dalexio:base-tap-state";

export interface BaseTapLocalState {
  day: string;
  todayPoints: number;
  cycleTaps: number;
  cooldownUntil: number | null;
  lifetimeFloor: number;
}

export function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

export function baseTapStorageKey(playerId: string): string | null {
  if (!playerId || playerId === "pending-player") return null;
  return `dalexio-base-tap-daily:${playerId}`;
}

function sanitizeState(value: Partial<BaseTapLocalState>, serverLifetime: number): BaseTapLocalState {
  const today = utcDay();
  const sameDay = value.day === today;
  const todayPoints =
    sameDay && Number.isInteger(value.todayPoints) && (value.todayPoints ?? 0) >= 0
      ? value.todayPoints ?? 0
      : 0;
  const cycleTaps =
    sameDay && Number.isInteger(value.cycleTaps) && (value.cycleTaps ?? 0) >= 0
      ? Math.min(value.cycleTaps ?? 0, 50)
      : 0;
  const rawCooldown = sameDay && typeof value.cooldownUntil === "number" ? value.cooldownUntil : null;
  const cooldownUntil = rawCooldown !== null && rawCooldown > Date.now() ? rawCooldown : null;
  const lifetimeFloor =
    Number.isInteger(value.lifetimeFloor) && (value.lifetimeFloor ?? 0) >= 0
      ? Math.max(serverLifetime, value.lifetimeFloor ?? 0)
      : serverLifetime;

  return {
    day: today,
    todayPoints,
    cycleTaps: cooldownUntil === null && cycleTaps >= 50 ? 0 : cycleTaps,
    cooldownUntil,
    lifetimeFloor,
  };
}

export function readBaseTapLocalState(playerId: string, serverLifetime = 0): BaseTapLocalState {
  const fallback = sanitizeState({}, serverLifetime);
  const key = baseTapStorageKey(playerId);
  if (!key || typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return sanitizeState(JSON.parse(raw) as Partial<BaseTapLocalState>, serverLifetime);
  } catch {
    return fallback;
  }
}

export function writeBaseTapLocalState(playerId: string, state: BaseTapLocalState): void {
  const key = baseTapStorageKey(playerId);
  if (!key || typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(state));
  window.dispatchEvent(
    new CustomEvent(BASE_TAP_STATE_EVENT, { detail: { playerId } }),
  );
}

export function displayedLifetime(
  serverLifetime: number,
  state: BaseTapLocalState,
): number {
  return Math.max(serverLifetime + state.todayPoints, state.lifetimeFloor);
}
