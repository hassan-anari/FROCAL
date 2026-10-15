import { apiRequest, ApiError } from "./client";
import { tapBatchInputSchema, tapBatchResultSchema, tapErrorSchema, tapStateSchema, type WireTapResult, type WireTapState } from "./tapV2Contract";
import { snapshotSchema, TapTransportError, type TapJournal, type TapPort, type TapSnapshot, type TapSubmission } from "@/game/base/tapV2/model";
import { recoverLegacyQueues } from "@/game/base/tapV2/legacyRecovery";
import { recoverLegacyTapReceipt } from "./baseTap";

const definitive = new Set(["LEASE_UNKNOWN", "LEASE_REVOKED", "LEASE_EXPIRED", "ALLOWANCE_EXHAUSTED", "SEQUENCE_REPLAY",
  "SEASON_CHANGED", "SEASON_UNAVAILABLE", "SEASON_FINALIZED", "EPOCH_FINALIZED", "PLAYER_RESTRICTED"]);

async function call(path: string, initData: string | null, signal: AbortSignal, body?: unknown, keepalive = false): Promise<unknown> {
  let response: Response;
  try {
    response = await apiRequest(`/base/v2/${path}`, { initData, signal, keepalive, returnErrorResponse: true,
      ...(body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  } catch (error) {
    if (error instanceof ApiError && ["LAUNCH_DATA_MISSING", "AUTH_INVALID", "AUTH_EXPIRED"].includes(error.code)) throw new TapTransportError("reauthorize", 0, error.code);
    throw new TapTransportError("retry");
  }
  let payload: unknown;
  try { payload = await response.json(); } catch { throw new TapTransportError("retry", 0, "RESPONSE_INVALID"); }
  if (response.ok) return payload;
  const parsed = tapErrorSchema.safeParse(payload);
  if (!parsed.success) throw new TapTransportError(response.status >= 500 || response.status === 404 ? "retry" : "reauthorize", 0, "RESPONSE_INVALID");
  const error = parsed.data;
  const retryHeader = response.headers.get("Retry-After");
  const headerMs = retryHeader && /^\d+(\.\d+)?$/.test(retryHeader) ? Number(retryHeader) * 1000 : 0;
  const delay = Math.max(error.retry_after_ms ?? 0, headerMs);
  if (error.code === "RATE_LIMITED" || error.code === "COOLDOWN") throw new TapTransportError("rate-limit", delay, error.code);
  if (["AUTH_UNAVAILABLE", "ISSUANCE_DISABLED", "LEGACY_DRAIN_REQUIRED", "CONFIG_UNAVAILABLE", "TEMPORARY_UNAVAILABLE"].includes(error.code)) throw new TapTransportError("retry", delay, error.code);
  const failure = new TapTransportError(definitive.has(error.code) || error.code === "IDEMPOTENCY_CONFLICT" ? "terminal" : "reauthorize", delay, error.code);
  failure.definitive = definitive.has(error.code);
  throw failure;
}

export function normalizeTapState(state: WireTapState): TapSnapshot {
  const policy = { levels: state.progression_policy.levels.map((level) => ({ level: level.level, minimum: level.min_lifetime_points })),
    stages: state.progression_policy.dexo_stages.map((stage) => ({ key: stage.key, minimumLevel: stage.min_level })) };
  const lease = state.lease;
  return snapshotSchema.parse({
    player: state.player_id, season: state.season_id ?? "no-active-season", config: state.config_version,
    revision: state.revision, receiptCursor: state.receipt_cursor, serverTime: Date.parse(state.server_time),
    lifetime: state.progression.lifetime_points, seasonPoints: state.season_points, progression: policy,
    earningAllowed: state.reward_earning_allowed, issuanceEnabled: state.issuance_enabled,
    cooldownUntil: state.cooldown_until === null ? null : Date.parse(state.cooldown_until),
    ...(state.ownership ? { ownership: { status: state.ownership.status, generation: state.generation,
      activeUntil: state.ownership.active_until ? Date.parse(state.ownership.active_until) : null,
      explicitSwitchRequired: state.ownership.explicit_switch_required } } : {}),
    grant: lease ? {
      scope: { player: state.player_id, season: lease.season_id, config: lease.config_version, session: lease.session_id, lease: lease.lease_id, generation: lease.generation },
      expiresAt: Date.parse(lease.expires_at), remaining: state.burst_remaining, sequenceCursor: lease.sequence_start - 1,
      pointsPerTouch: lease.reward_per_tap, batchLimit: lease.max_taps_per_batch, minBatchInterval: lease.min_batch_interval_ms,
      cooldownDuration: lease.cooldown_seconds * 1000, progression: policy,
    } : null,
    receipts: [], rejections: [],
  });
}

function requestFor(batch: Readonly<TapSubmission>) {
  const input = tapBatchInputSchema.parse({ lease_id: batch.scope.lease, session_id: batch.scope.session,
    generation: batch.scope.generation, sequence_start: batch.sequences[0], tap_count: batch.sequences.length, idempotency_key: batch.key });
  if (batch.sequences.some((sequence, index) => sequence !== input.sequence_start + index)) throw new TapTransportError("reauthorize", 0, "REQUEST_INVALID");
  return input;
}

function receiptFor(batch: Readonly<TapSubmission>, result: WireTapResult) {
  const receipt = result.receipt;
  const request = requestFor(batch);
  if (receipt.idempotency_key !== request.idempotency_key || receipt.lease_id !== request.lease_id
    || receipt.session_id !== request.session_id || receipt.generation !== request.generation
    || receipt.sequence_start !== request.sequence_start || receipt.requested_taps !== request.tap_count
    || receipt.season_id !== batch.scope.season || receipt.config_version !== batch.scope.config
    || receipt.receipt_id !== result.receipt_id || receipt.sequence_through !== result.sequence_through
    || receipt.accepted_taps !== result.accepted_taps || receipt.rejected_taps !== result.rejected_taps
    || receipt.earned_points !== result.earned_points
    || result.accepted_taps + result.rejected_taps !== batch.sequences.length
    || result.sequence_through !== batch.sequences[0] + result.accepted_taps - 1
    || result.snapshot.receipt_cursor < result.receipt_id) throw new TapTransportError("reauthorize", 0, "RESPONSE_INVALID");
  return { scope: batch.scope, key: batch.key, accepted: result.accepted_taps, rejected: result.rejected_taps,
    through: result.sequence_through, receiptId: result.receipt_id };
}

/** Credentials stay in this authenticated lifetime's closure, never the journal. */
export function createTapPort(player: string, initData: string | null, verifiedAliases: readonly string[] = [player]): TapPort {
  async function read(session: string, signal: AbortSignal) {
    const state = tapStateSchema.parse(await call(`tap-state?session_id=${encodeURIComponent(session)}`, initData, signal));
    if (state.player_id !== player) throw new TapTransportError("terminal", 0, "PLAYER_MISMATCH");
    return state;
  }
  async function submit(batch: Readonly<TapSubmission>, signal: AbortSignal) {
    const result = tapBatchResultSchema.parse(await call("tap-batches", initData, signal, requestFor(batch)));
    const snapshot = normalizeTapState(result.snapshot);
    if (snapshot.player !== player) throw new TapTransportError("terminal", 0, "PLAYER_MISMATCH");
    return { ...snapshot, receipts: [receiptFor(batch, result)] };
  }
  async function synchronize(journal: Readonly<TapJournal>, signal: AbortSignal, switchGeneration?: number) {
    if (!journal.session) throw new TapTransportError("reauthorize", 0, "SESSION_MISSING");
    let state = await read(journal.session, signal);
    let recoveredLegacy = false;
    if (state.issuance_enabled && initData) {
      await recoverLegacyQueues(localStorage, verifiedAliases, async (pending) => {
        recoveredLegacy = true;
        const result = await recoverLegacyTapReceipt({ ...pending, initData, signal });
        return result ? "confirmed" : "unavailable";
      });
    }
    const receipts: TapSnapshot["receipts"] = [];
    const rejections: TapSnapshot["rejections"] = [];
    // Exact replay precedes fresh authorization. State sequence cursors never erase request evidence.
    // Checkpoint one exact replay per reconciliation. The controller persists its
    // evidence before draining the rest, so a slow network cannot repeatedly time
    // out an entire restored journal without ever making durable progress.
    for (const batch of journal.batches.filter((item) => !item.blocked).slice(0, 1)) {
      try { const result = await submit(batch, signal); receipts.push(...result.receipts); }
      catch (error) {
        if (!(error instanceof TapTransportError) || error.kind !== "terminal" || !definitive.has(error.code)) throw error;
        rejections.push({ scope: batch.scope, key: batch.key, code: error.code });
      }
    }
    if (journal.batches.length || recoveredLegacy) state = await read(journal.session, signal);
    const conflict = (code: string) => {
      const error = new TapTransportError("reauthorize", 0, code);
      error.snapshot = { ...normalizeTapState(state), receipts, rejections };
      return error;
    };
    // A fenced client can read/replay receipts but must not acquire automatically.
    if (switchGeneration === undefined && state.ownership?.explicit_switch_required) {
      throw conflict(state.ownership.status === "SESSION_MOVED" ? "LEASE_REVOKED" : "ACTIVE_SESSION");
    }
    if (switchGeneration !== undefined && state.ownership?.status !== "OWNED") {
      if (!state.ownership || state.generation !== switchGeneration) throw conflict("GENERATION_STALE");
      try {
        state = tapStateSchema.parse(await call("tap-leases", initData, signal,
          { session_id: journal.session, takeover: true, expected_generation: switchGeneration }));
      } catch (error) {
        if (error instanceof TapTransportError) error.snapshot = { ...normalizeTapState(state), receipts, rejections };
        throw error;
      }
    }
    if ((!state.lease || state.burst_remaining === 0) && state.issuance_enabled && state.reward_earning_allowed
      && (state.cooldown_until === null || Date.parse(state.cooldown_until) <= Date.parse(state.server_time))) {
      try {
        state = tapStateSchema.parse(await call("tap-leases", initData, signal, { session_id: journal.session, takeover: false, expected_generation: null }));
      } catch (error) {
        if (error instanceof TapTransportError) error.snapshot = { ...normalizeTapState(state), receipts, rejections };
        throw error;
      }
    }
    return { ...normalizeTapState(state), receipts, rejections };
  }
  return { submit, synchronize,
    switchSession: (journal, generation, signal) => synchronize(journal, signal, generation),
    releaseSession: async (grant, signal) => {
      await call("tap-release", initData, signal, { lease_id: grant.scope.lease,
        session_id: grant.scope.session, generation: grant.scope.generation ?? 1 }, true);
    },
  };
}
