import { useCallback, useEffect, useRef, useState } from "react";
import {
  createBaseTapIdempotencyKey,
  submitBaseTapBatch,
  type BaseTapResult,
} from "./baseTap";

// Mirrors the published S1 client boundary. The backend remains authoritative.
const MAX_TAPS_PER_BATCH = 50;
const FLUSH_DELAY_MS = 350;
const RETRY_DELAY_MS = 900;
const MAX_AUTOMATIC_RETRIES = 1;

interface PendingBatch {
  tapCount: number;
  idempotencyKey: string;
  retries: number;
}

export interface BaseTapBatcher {
  queueTap: () => boolean;
  queuedTaps: number;
  isSyncing: boolean;
  result: BaseTapResult | null;
  error: string | null;
}

export function useBaseTapBatcher(initData: string | null): BaseTapBatcher {
  const [queuedTaps, setQueuedTaps] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<BaseTapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initDataRef = useRef(initData);
  const bufferRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const pendingBatchRef = useRef<PendingBatch | null>(null);
  const resultRef = useRef<BaseTapResult | null>(null);
  const mountedRef = useRef(true);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    initDataRef.current = initData;
  }, [initData]);

  const scheduleFlush = useCallback((delay: number) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, delay);
  }, []);

  const flush = useCallback(async () => {
    if (inFlightRef.current) return;
    const auth = initDataRef.current?.trim();
    if (!auth) return;

    let batch = pendingBatchRef.current;
    if (!batch) {
      const tapCount = Math.min(bufferRef.current, MAX_TAPS_PER_BATCH);
      if (tapCount <= 0) return;
      bufferRef.current -= tapCount;
      if (mountedRef.current) setQueuedTaps(bufferRef.current);
      batch = {
        tapCount,
        idempotencyKey: createBaseTapIdempotencyKey(),
        retries: 0,
      };
      pendingBatchRef.current = batch;
    }

    inFlightRef.current = true;
    if (mountedRef.current) {
      setIsSyncing(true);
      setError(null);
    }

    try {
      const nextResult = await submitBaseTapBatch({
        tapCount: batch.tapCount,
        initData: auth,
        idempotencyKey: batch.idempotencyKey,
      });
      pendingBatchRef.current = null;
      resultRef.current = nextResult;
      if (nextResult.daily_remaining_taps === 0) {
        bufferRef.current = 0;
        if (mountedRef.current) setQueuedTaps(0);
      }
      if (mountedRef.current) setResult(nextResult);
    } catch (cause) {
      batch.retries += 1;
      pendingBatchRef.current = batch;
      if (mountedRef.current) {
        setError(cause instanceof Error ? cause.message : "Base Tap sync failed");
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setIsSyncing(false);
    }

    const pending = pendingBatchRef.current;
    if (pending && pending.retries <= MAX_AUTOMATIC_RETRIES) {
      scheduleFlush(RETRY_DELAY_MS);
    } else if (!pending && bufferRef.current > 0) {
      scheduleFlush(FLUSH_DELAY_MS);
    }
  }, [scheduleFlush]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const queueTap = useCallback(() => {
    if (!initDataRef.current?.trim()) return false;

    const knownRemaining = resultRef.current?.daily_remaining_taps ?? MAX_TAPS_PER_BATCH;
    const outstanding = bufferRef.current + (pendingBatchRef.current?.tapCount ?? 0);
    if (knownRemaining <= 0 || outstanding >= knownRemaining) return false;

    bufferRef.current += 1;
    setQueuedTaps(bufferRef.current);
    setError(null);
    scheduleFlush(FLUSH_DELAY_MS);
    return true;
  }, [scheduleFlush]);

  return { queueTap, queuedTaps, isSyncing, result, error };
}
