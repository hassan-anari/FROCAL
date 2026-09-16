import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBaseTapIdempotencyKey,
  submitBaseTapBatch,
  type BaseTapResult,
} from "./baseTap";

const MAX_TAPS_PER_BATCH = 50;
const FLUSH_DELAY_MS = 5_000;
const DRAIN_DELAY_MS = 300;
const RETRY_DELAY_MS = 1_200;
const MAX_AUTOMATIC_RETRIES = 2;

interface PendingBatch {
  tapCount: number;
  idempotencyKey: string;
  retries: number;
}

interface PersistedQueue {
  day: string;
  buffer: number;
  pending: PendingBatch | null;
}

export interface BaseTapBatcher {
  queueTap: () => boolean;
  result: BaseTapResult | null;
  resultVersion: number;
  error: string | null;
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(scope: string): string | null {
  if (!scope || scope === "pending-player") return null;
  return `dalexio-base-tap-queue:${scope}`;
}

export function useBaseTapBatcher(
  initData: string | null,
  storageScope: string,
): BaseTapBatcher {
  const [result, setResult] = useState<BaseTapResult | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const initDataRef = useRef(initData);
  const queueDayRef = useRef(utcDay());
  const bufferRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const pendingBatchRef = useRef<PendingBatch | null>(null);
  const mountedRef = useRef(true);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const persistQueue = useCallback(() => {
    const key = storageKey(storageScope);
    if (!key || typeof window === "undefined") return;
    const payload: PersistedQueue = {
      day: queueDayRef.current,
      buffer: bufferRef.current,
      pending: pendingBatchRef.current,
    };
    window.localStorage.setItem(key, JSON.stringify(payload));
  }, [storageScope]);

  const clearForNewDay = useCallback(() => {
    const day = utcDay();
    if (day === queueDayRef.current) return false;
    queueDayRef.current = day;
    bufferRef.current = 0;
    pendingBatchRef.current = null;
    setError(null);
    persistQueue();
    return true;
  }, [persistQueue]);

  const scheduleFlush = useCallback((delay: number) => {
    if (timerRef.current !== null) return;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, delay);
  }, []);

  useEffect(() => {
    initDataRef.current = initData;
    if (initData?.trim() && (bufferRef.current > 0 || pendingBatchRef.current)) {
      scheduleFlush(120);
    }
  }, [initData, scheduleFlush]);

  useEffect(() => {
    const key = storageKey(storageScope);
    queueDayRef.current = utcDay();
    bufferRef.current = 0;
    pendingBatchRef.current = null;
    if (!key || typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedQueue>;
      if (parsed.day !== queueDayRef.current) {
        window.localStorage.removeItem(key);
        return;
      }
      bufferRef.current =
        Number.isInteger(parsed.buffer) && (parsed.buffer ?? 0) > 0 ? parsed.buffer! : 0;
      if (
        parsed.pending &&
        Number.isInteger(parsed.pending.tapCount) &&
        parsed.pending.tapCount > 0 &&
        typeof parsed.pending.idempotencyKey === "string"
      ) {
        pendingBatchRef.current = {
          tapCount: parsed.pending.tapCount,
          idempotencyKey: parsed.pending.idempotencyKey,
          retries: Number.isInteger(parsed.pending.retries) ? parsed.pending.retries : 0,
        };
      }
      if (bufferRef.current > 0 || pendingBatchRef.current) scheduleFlush(120);
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [scheduleFlush, storageScope]);

  const flush = useCallback(async () => {
    if (inFlightRef.current) return;
    if (clearForNewDay()) return;

    const auth = initDataRef.current?.trim();
    if (!auth) return;

    let batch = pendingBatchRef.current;
    if (!batch) {
      const tapCount = Math.min(bufferRef.current, MAX_TAPS_PER_BATCH);
      if (tapCount <= 0) return;
      bufferRef.current -= tapCount;
      batch = {
        tapCount,
        idempotencyKey: createBaseTapIdempotencyKey(),
        retries: 0,
      };
      pendingBatchRef.current = batch;
      persistQueue();
    }

    inFlightRef.current = true;
    if (mountedRef.current) setError(null);

    try {
      const nextResult = await submitBaseTapBatch({
        tapCount: batch.tapCount,
        initData: auth,
        idempotencyKey: batch.idempotencyKey,
      });
      pendingBatchRef.current = null;
      persistQueue();
      if (mountedRef.current) {
        setResult(nextResult);
        setResultVersion((version) => version + 1);
      }
    } catch (cause) {
      batch.retries += 1;
      pendingBatchRef.current = batch;
      persistQueue();
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : "Base Tap sync failed");
      }
    } finally {
      inFlightRef.current = false;
    }

    const pending = pendingBatchRef.current;
    if (pending && pending.retries <= MAX_AUTOMATIC_RETRIES) {
      scheduleFlush(RETRY_DELAY_MS);
    } else if (!pending && bufferRef.current > 0) {
      scheduleFlush(DRAIN_DELAY_MS);
    }
  }, [clearForNewDay, persistQueue, scheduleFlush]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      persistQueue();
    },
    [persistQueue],
  );

  const queueTap = useCallback(() => {
    if (!initDataRef.current?.trim()) return false;
    clearForNewDay();

    if (pendingBatchRef.current && pendingBatchRef.current.retries > MAX_AUTOMATIC_RETRIES) {
      pendingBatchRef.current.retries = 0;
    }

    bufferRef.current += 1;
    persistQueue();
    setError(null);

    if (bufferRef.current >= MAX_TAPS_PER_BATCH) {
      scheduleFlush(0);
    } else {
      scheduleFlush(FLUSH_DELAY_MS);
    }
    return true;
  }, [clearForNewDay, persistQueue, scheduleFlush]);

  return { queueTap, result, resultVersion, error };
}
