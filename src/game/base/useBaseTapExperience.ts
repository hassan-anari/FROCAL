import { useCallback, useEffect, useRef, useState } from "react";
import {
  displayedLifetime,
  readBaseTapLocalState,
  utcDay,
  writeBaseTapLocalState,
  type BaseTapLocalState,
} from "./baseTapLocalState";
import { useBaseTapBatcher } from "@/integrations/api/useBaseTapBatcher";

export const BASE_TAP_BURST_LIMIT = 50;
export const BASE_TAP_COOLDOWN_MS = 10_000;

interface UseBaseTapExperienceInput {
  enabled: boolean;
  initData: string | null;
  playerId: string;
  serverLifetime: number;
}

export function useBaseTapExperience({
  enabled,
  initData,
  playerId,
  serverLifetime,
}: UseBaseTapExperienceInput) {
  const batcher = useBaseTapBatcher(initData, playerId);
  const [state, setState] = useState<BaseTapLocalState>(() =>
    readBaseTapLocalState(playerId, serverLifetime),
  );
  const [cooldownCycle, setCooldownCycle] = useState(0);
  const stateRef = useRef(state);
  const cooldownTimerRef = useRef<number | null>(null);
  const handledResultVersionRef = useRef(0);

  const commit = useCallback(
    (next: BaseTapLocalState) => {
      stateRef.current = next;
      setState(next);
      writeBaseTapLocalState(playerId, next);
    },
    [playerId],
  );

  const clearCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current !== null) {
      window.clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const finishCooldown = useCallback(() => {
    clearCooldownTimer();
    const current = stateRef.current;
    if (current.cooldownUntil === null) return;
    commit({ ...current, cycleTaps: 0, cooldownUntil: null });
  }, [clearCooldownTimer, commit]);

  const scheduleCooldown = useCallback(
    (until: number | null) => {
      clearCooldownTimer();
      if (until === null) return;
      const remaining = until - Date.now();
      if (remaining <= 0) {
        finishCooldown();
        return;
      }
      cooldownTimerRef.current = window.setTimeout(finishCooldown, remaining);
    },
    [clearCooldownTimer, finishCooldown],
  );

  const resetForNewDay = useCallback(() => {
    const current = stateRef.current;
    const day = utcDay();
    if (current.day === day) return;
    clearCooldownTimer();
    commit({
      day,
      todayPoints: 0,
      cycleTaps: 0,
      cooldownUntil: null,
      lifetimeFloor: Math.max(current.lifetimeFloor, serverLifetime),
    });
  }, [clearCooldownTimer, commit, serverLifetime]);

  useEffect(() => {
    const restored = readBaseTapLocalState(playerId, serverLifetime);
    const normalized = {
      ...restored,
      lifetimeFloor: Math.max(
        restored.lifetimeFloor,
        serverLifetime + restored.todayPoints,
      ),
    };
    stateRef.current = normalized;
    setState(normalized);
    writeBaseTapLocalState(playerId, normalized);
    scheduleCooldown(normalized.cooldownUntil);
  }, [playerId, scheduleCooldown, serverLifetime]);

  useEffect(() => {
    const current = stateRef.current;
    const nextFloor = Math.max(
      current.lifetimeFloor,
      serverLifetime + current.todayPoints,
    );
    if (nextFloor !== current.lifetimeFloor) {
      commit({ ...current, lifetimeFloor: nextFloor });
    }
  }, [commit, serverLifetime]);

  useEffect(() => {
    const interval = window.setInterval(resetForNewDay, 15_000);
    return () => window.clearInterval(interval);
  }, [resetForNewDay]);

  useEffect(() => {
    if (!batcher.result || batcher.resultVersion === handledResultVersionRef.current) return;
    handledResultVersionRef.current = batcher.resultVersion;
    const rejected = batcher.result.rejected_taps;
    if (rejected <= 0) return;

    const current = stateRef.current;
    const nextTodayPoints = Math.max(0, current.todayPoints - rejected);
    commit({
      ...current,
      todayPoints: nextTodayPoints,
      lifetimeFloor: Math.max(
        serverLifetime + nextTodayPoints,
        serverLifetime,
        current.lifetimeFloor - rejected,
      ),
    });
  }, [batcher.result, batcher.resultVersion, commit, serverLifetime]);

  useEffect(
    () => () => {
      clearCooldownTimer();
    },
    [clearCooldownTimer],
  );

  const tap = useCallback(() => {
    resetForNewDay();
    if (!enabled) return false;

    const current = stateRef.current;
    if (current.cooldownUntil !== null && current.cooldownUntil > Date.now()) return false;
    if (!batcher.queueTap()) return false;

    const nextTodayPoints = current.todayPoints + 1;
    const nextCycleTaps = current.cycleTaps + 1;
    const startsCooldown = nextCycleTaps >= BASE_TAP_BURST_LIMIT;
    const cooldownUntil = startsCooldown ? Date.now() + BASE_TAP_COOLDOWN_MS : null;
    const next: BaseTapLocalState = {
      ...current,
      day: utcDay(),
      todayPoints: nextTodayPoints,
      cycleTaps: startsCooldown ? BASE_TAP_BURST_LIMIT : nextCycleTaps,
      cooldownUntil,
      lifetimeFloor: Math.max(current.lifetimeFloor, serverLifetime + nextTodayPoints),
    };

    commit(next);
    if (startsCooldown) {
      setCooldownCycle((cycle) => cycle + 1);
      scheduleCooldown(cooldownUntil);
    }
    return true;
  }, [batcher, commit, enabled, resetForNewDay, scheduleCooldown, serverLifetime]);

  const visualLifetime = displayedLifetime(serverLifetime, state);
  const isCoolingDown = state.cooldownUntil !== null && state.cooldownUntil > Date.now();

  return {
    tap,
    todayPoints: state.todayPoints,
    visualLifetime,
    isCoolingDown,
    cooldownCycle,
    cooldownMs: BASE_TAP_COOLDOWN_MS,
    cooldownUntil: state.cooldownUntil,
  };
}
