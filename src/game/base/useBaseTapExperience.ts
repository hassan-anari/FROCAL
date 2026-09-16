import { useCallback, useEffect, useRef, useState } from "react";
import { useBaseTapBatcher } from "@/integrations/api/useBaseTapBatcher";

export const BASE_TAP_COOLDOWN_MS = 600;

interface PersistedDailyTapState {
  day: string;
  points: number;
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

function readDailyState(playerId: string): PersistedDailyTapState {
  const day = utcDay();
  if (typeof window === "undefined" || !playerId || playerId === "pending-player") {
    return { day, points: 0 };
  }

  try {
    const raw = window.localStorage.getItem(storageKey(playerId));
    if (!raw) return { day, points: 0 };
    const parsed = JSON.parse(raw) as Partial<PersistedDailyTapState>;
    if (parsed.day !== day || !Number.isInteger(parsed.points) || (parsed.points ?? 0) < 0) {
      window.localStorage.removeItem(storageKey(playerId));
      return { day, points: 0 };
    }
    return { day, points: parsed.points ?? 0 };
  } catch {
    return { day, points: 0 };
  }
}

export function useBaseTapExperience({ enabled, initData, playerId }: UseBaseTapExperienceInput) {
  const batcher = useBaseTapBatcher(initData, playerId);
  const [todayPoints, setTodayPoints] = useState(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownCycle, setCooldownCycle] = useState(0);
  const dayRef = useRef(utcDay());
  const cooldownTimerRef = useRef<number | null>(null);
  const handledResultVersionRef = useRef(0);

  const persist = useCallback(
    (points: number, day = dayRef.current) => {
      if (typeof window === "undefined" || !playerId || playerId === "pending-player") return;
      window.localStorage.setItem(storageKey(playerId), JSON.stringify({ day, points }));
    },
    [playerId],
  );

  const resetForNewDay = useCallback(() => {
    const day = utcDay();
    if (day === dayRef.current) return;
    dayRef.current = day;
    setTodayPoints(0);
    persist(0, day);
  }, [persist]);

  useEffect(() => {
    const restored = readDailyState(playerId);
    dayRef.current = restored.day;
    setTodayPoints(restored.points);
  }, [playerId]);

  useEffect(() => {
    const interval = window.setInterval(resetForNewDay, 30_000);
    return () => window.clearInterval(interval);
  }, [resetForNewDay]);

  useEffect(() => {
    if (!batcher.result || batcher.resultVersion === handledResultVersionRef.current) return;
    handledResultVersionRef.current = batcher.resultVersion;

    setTodayPoints((current) => {
      const optimisticAfterReject = Math.max(0, current - batcher.result!.rejected_taps);
      const next = Math.max(optimisticAfterReject, batcher.result!.daily_accepted_taps);
      persist(next);
      return next;
    });
  }, [batcher.result, batcher.resultVersion, persist]);

  useEffect(
    () => () => {
      if (cooldownTimerRef.current !== null) window.clearTimeout(cooldownTimerRef.current);
    },
    [],
  );

  const tap = useCallback(() => {
    resetForNewDay();
    if (!enabled || isCoolingDown || !batcher.queueTap()) return false;

    setTodayPoints((current) => {
      const next = current + 1;
      persist(next);
      return next;
    });

    setIsCoolingDown(true);
    setCooldownCycle((cycle) => cycle + 1);
    if (cooldownTimerRef.current !== null) window.clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setTimeout(() => {
      cooldownTimerRef.current = null;
      setIsCoolingDown(false);
    }, BASE_TAP_COOLDOWN_MS);

    return true;
  }, [batcher, enabled, isCoolingDown, persist, resetForNewDay]);

  return {
    tap,
    todayPoints,
    isCoolingDown,
    cooldownCycle,
    cooldownMs: BASE_TAP_COOLDOWN_MS,
  };
}
