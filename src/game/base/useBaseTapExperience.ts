import { useCallback, useEffect, useRef, useState } from "react";
import { useBaseTapBatcher } from "@/integrations/api/useBaseTapBatcher";

export const BASE_TAP_WINDOW_SIZE = 50;
export const BASE_TAP_COOLDOWN_MS = 10_000;
export const BASE_TAP_POINTS_EVENT = "dalexio:base-tap-points";

interface PersistedDailyTapState {
  day: string;
  points: number;
  windowTaps: number;
  cooldownUntil: number | null;
}

interface UseBaseTapExperienceInput {
  enabled: boolean;
  initData: string | null;
  playerId: string;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(playerId: string): string {
  return `dalexio-base-tap-daily:${playerId}`;
}

function emptyState(): PersistedDailyTapState {
  return { day: utcDay(), points: 0, windowTaps: 0, cooldownUntil: null };
}

function readDailyState(playerId: string): PersistedDailyTapState {
  const fallback = emptyState();
  if (typeof window === "undefined" || !playerId || playerId === "pending-player") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey(playerId));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedDailyTapState>;
    if (parsed.day !== fallback.day || !Number.isInteger(parsed.points) || (parsed.points ?? 0) < 0) {
      window.localStorage.removeItem(storageKey(playerId));
      return fallback;
    }

    const windowTaps = Number.isInteger(parsed.windowTaps)
      ? Math.min(BASE_TAP_WINDOW_SIZE, Math.max(0, parsed.windowTaps ?? 0))
      : 0;
    const cooldownUntil =
      typeof parsed.cooldownUntil === "number" && Number.isFinite(parsed.cooldownUntil)
        ? parsed.cooldownUntil
        : null;

    return {
      day: fallback.day,
      points: parsed.points ?? 0,
      windowTaps,
      cooldownUntil,
    };
  } catch {
    window.localStorage.removeItem(storageKey(playerId));
    return fallback;
  }
}

export function readBaseTapDailyPoints(playerId: string): number {
  return readDailyState(playerId).points;
}

function emitPoints(playerId: string, points: number): void {
  if (typeof window === "undefined" || !playerId || playerId === "pending-player") return;
  window.dispatchEvent(
    new CustomEvent(BASE_TAP_POINTS_EVENT, {
      detail: { playerId, points, day: utcDay() },
    }),
  );
}

export function useBaseTapExperience({ enabled, initData, playerId }: UseBaseTapExperienceInput) {
  const batcher = useBaseTapBatcher(initData, playerId);
  const [todayPoints, setTodayPoints] = useState(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownCycle, setCooldownCycle] = useState(0);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);

  const dayRef = useRef(utcDay());
  const pointsRef = useRef(0);
  const windowTapsRef = useRef(0);
  const cooldownUntilRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const handledResultVersionRef = useRef(0);

  const persist = useCallback(() => {
    if (typeof window === "undefined" || !playerId || playerId === "pending-player") return;
    const payload: PersistedDailyTapState = {
      day: dayRef.current,
      points: pointsRef.current,
      windowTaps: windowTapsRef.current,
      cooldownUntil: cooldownUntilRef.current,
    };
    window.localStorage.setItem(storageKey(playerId), JSON.stringify(payload));
    emitPoints(playerId, pointsRef.current);
  }, [playerId]);

  const clearCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const finishCooldown = useCallback(() => {
    clearCooldownTimer();
    windowTapsRef.current = 0;
    cooldownUntilRef.current = null;
    setIsCoolingDown(false);
    setCooldownRemainingMs(0);
    persist();
  }, [clearCooldownTimer, persist]);

  const beginCooldown = useCallback(
    (durationMs: number, cooldownUntil: number) => {
      clearCooldownTimer();
      cooldownUntilRef.current = cooldownUntil;
      setIsCoolingDown(true);
      setCooldownRemainingMs(durationMs);
      setCooldownCycle((cycle) => cycle + 1);
      cooldownTimerRef.current = window.setTimeout(finishCooldown, durationMs);
      persist();
    },
    [clearCooldownTimer, finishCooldown, persist],
  );

  const resetForNewDay = useCallback(() => {
    const day = utcDay();
    if (day === dayRef.current) return false;
    clearCooldownTimer();
    dayRef.current = day;
    pointsRef.current = 0;
    windowTapsRef.current = 0;
    cooldownUntilRef.current = null;
    setTodayPoints(0);
    setIsCoolingDown(false);
    setCooldownRemainingMs(0);
    persist();
    return true;
  }, [clearCooldownTimer, persist]);

  useEffect(() => {
    clearCooldownTimer();
    const restored = readDailyState(playerId);
    dayRef.current = restored.day;
    pointsRef.current = restored.points;
    windowTapsRef.current = restored.windowTaps;
    cooldownUntilRef.current = restored.cooldownUntil;
    setTodayPoints(restored.points);
    emitPoints(playerId, restored.points);

    const remaining = (restored.cooldownUntil ?? 0) - Date.now();
    if (remaining > 0) {
      beginCooldown(remaining, restored.cooldownUntil!);
    } else if (restored.cooldownUntil !== null || restored.windowTaps >= BASE_TAP_WINDOW_SIZE) {
      finishCooldown();
    } else {
      setIsCoolingDown(false);
      setCooldownRemainingMs(0);
    }
  }, [beginCooldown, clearCooldownTimer, finishCooldown, playerId]);

  useEffect(() => {
    const interval = window.setInterval(resetForNewDay, 30_000);
    return () => window.clearInterval(interval);
  }, [resetForNewDay]);

  useEffect(() => {
    if (!batcher.result || batcher.resultVersion === handledResultVersionRef.current) return;
    handledResultVersionRef.current = batcher.resultVersion;

    const optimisticAfterReject = Math.max(0, pointsRef.current - batcher.result.rejected_taps);
    const reconciled = Math.max(optimisticAfterReject, batcher.result.daily_accepted_taps);
    if (reconciled !== pointsRef.current) {
      pointsRef.current = reconciled;
      setTodayPoints(reconciled);
      persist();
    }
  }, [batcher.result, batcher.resultVersion, persist]);

  useEffect(
    () => () => {
      clearCooldownTimer();
      persist();
    },
    [clearCooldownTimer, persist],
  );

  const tap = useCallback(() => {
    resetForNewDay();
    const now = Date.now();
    if (cooldownUntilRef.current !== null && cooldownUntilRef.current <= now) finishCooldown();
    if (!enabled || (cooldownUntilRef.current ?? 0) > now || !batcher.queueTap()) return false;

    pointsRef.current += 1;
    windowTapsRef.current += 1;
    setTodayPoints(pointsRef.current);

    if (windowTapsRef.current >= BASE_TAP_WINDOW_SIZE) {
      beginCooldown(BASE_TAP_COOLDOWN_MS, now + BASE_TAP_COOLDOWN_MS);
    } else {
      persist();
    }
    return true;
  }, [batcher, beginCooldown, enabled, finishCooldown, persist, resetForNewDay]);

  return {
    tap,
    todayPoints,
    isCoolingDown,
    cooldownCycle,
    cooldownMs: cooldownRemainingMs || BASE_TAP_COOLDOWN_MS,
  };
}
