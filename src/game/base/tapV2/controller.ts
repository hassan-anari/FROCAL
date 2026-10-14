import { compareSnapshots, journalSchema, scopeId, snapshotSchema, TapTransportError, type TapBatch, type TapGrant, type TapJournal, type TapPort, type TapSnapshot } from "./model";
import { TapJournalStore, type DurableStorage } from "./journal";
import type { TapOwnership } from "./ownership";
import { authorizedProgression } from "./progression";

export interface TapView {
  status: "initializing" | "ready" | "paused" | "storage-blocked" | "session-busy" | "terminal" | "closed";
  committed: TapSnapshot | null;
  authorizedUnsent: number;
  lifetime: number | null;
  seasonPoints: number | null;
  remaining: number;
  progression: ReturnType<typeof authorizedProgression> | null;
  cooldownUntil: number | null;
  cooldownMs: number;
  cooldownRemainingMs: number;
  isCoolingDown: boolean;
  error: string | null;
  levelChange: { sequence: number; previousLevel: number; newLevel: number; stage: string; evolved: boolean } | null;
}
interface Dependencies {
  player: string;
  port: TapPort;
  ownership: TapOwnership;
  storage: () => DurableStorage;
  monotonicNow?: () => number;
  wallNow?: () => number;
  requestKey?: () => string;
  onCommitted?: (snapshot: TapSnapshot) => void;
  requestTimeoutMs?: number;
  retryJitterMs?: () => number;
}

/** Authorized display and durable delivery; only server receipts commit events. */
export class TapController {
  private journal: TapJournal;
  private store: TapJournalStore | null = null;
  private snapshot: TapSnapshot | null = null;
  private grant: TapGrant | null = null;
  private listeners = new Set<() => void>();
  private view: TapView;
  private status: TapView["status"] = "initializing";
  private owned = false;
  private generation = 0;
  private abort: AbortController | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private maintenance: ReturnType<typeof setTimeout> | null = null;
  private error: string | null = null;
  private starting = false;
  private scheduledAt = Infinity;
  private inFlight = false;
  private roundTrip = 240;
  private anchor: { server: number; monotonic: number; wall: number } | null = null;
  private localCooldown: number | null = null;
  private nextAttemptAt = 0;
  private levelChange: TapView["levelChange"] = null;
  private monotonic: () => number;
  private wall: () => number;

  constructor(private dependencies: Dependencies) {
    this.monotonic = dependencies.monotonicNow ?? (() => performance.now());
    this.wall = dependencies.wallNow ?? (() => Date.now());
    this.journal = journalSchema.parse({ version: 1, player: dependencies.player, events: [], batches: [] });
    this.view = this.calculate();
  }

  getSnapshot = () => this.view;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };

  private serverNow() {
    if (!this.anchor) return Infinity;
    const elapsed = this.monotonic() - this.anchor.monotonic;
    if (elapsed < 0) return Infinity;
    // Fast device-clock jumps may stop earning early, but never extend authorization.
    return this.anchor.server + Math.max(elapsed, this.wall() - this.anchor.wall, 0);
  }

  private calculate(): TapView {
    const pending = this.grant && this.status !== "terminal" ? this.journal.events.filter((event) => scopeId(event.scope) === scopeId(this.grant!.scope) && event.sequence > this.grant!.sequenceCursor).length : 0;
    const points = pending * (this.grant?.pointsPerTouch ?? 0);
    const lifetime = this.snapshot ? this.snapshot.lifetime + points : null;
    const deadline = Math.max(this.localCooldown ?? 0, this.snapshot?.cooldownUntil ?? 0);
    const remaining = Math.max(0, deadline - this.serverNow());
    return {
      status: this.status, committed: this.snapshot, authorizedUnsent: pending,
      lifetime, seasonPoints: this.snapshot ? this.snapshot.seasonPoints + points : null,
      remaining: this.grant ? Math.max(0, this.grant.remaining - pending) : 0,
      progression: lifetime !== null && this.snapshot ? authorizedProgression(lifetime, this.snapshot.progression) : null,
      cooldownUntil: deadline || null,
      cooldownMs: this.grant?.cooldownDuration ?? remaining,
      cooldownRemainingMs: remaining, isCoolingDown: remaining > 0, error: this.error,
      levelChange: this.levelChange,
    };
  }
  private emit() { this.view = this.calculate(); for (const listener of this.listeners) listener(); }

  private maintain(delay?: number) {
    if (this.maintenance !== null) clearTimeout(this.maintenance);
    if (["closed", "storage-blocked", "terminal"].includes(this.status)) return;
    const until = this.snapshot?.cooldownUntil ?? this.grant?.expiresAt;
    const wait = delay ?? (until ? Math.max(100, until - this.serverNow() + 30) : 15_000);
    this.maintenance = setTimeout(() => {
      this.maintenance = null;
      if (this.inFlight || this.monotonic() < this.nextAttemptAt) { this.maintain(1000); return; }
      void this.resume();
    }, Math.min(60_000, wait));
  }

  private async request<T>(operation: Promise<T>, abort: AbortController): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancel: (() => void) | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      cancel = () => reject(new TapTransportError("retry"));
      abort.signal.addEventListener("abort", cancel, { once: true });
      timeout = setTimeout(() => abort.abort(), this.dependencies.requestTimeoutMs ?? 12_000);
    });
    try { return await Promise.race([operation, deadline]); }
    finally {
      clearTimeout(timeout);
      if (cancel) abort.signal.removeEventListener("abort", cancel);
    }
  }

  async start() {
    if (this.status !== "initializing" || this.starting) return;
    this.starting = true;
    const acquired = await this.dependencies.ownership.acquire();
    if (this.status !== "initializing") { this.dependencies.ownership.release(); return; }
    if (!acquired) { this.status = "session-busy"; this.emit(); return; }
    this.owned = true;
    try {
      this.store = new TapJournalStore(this.dependencies.storage(), this.dependencies.player);
      this.journal = this.store.read();
      if (!this.journal.session && !this.save({ ...this.journal, session: crypto.randomUUID() })) return;
      if (this.journal.batches.some((batch) => batch.blocked)) {
        this.status = "terminal";
        this.emit();
        return;
      }
    } catch { this.status = "storage-blocked"; this.emit(); return; }
    await this.resume();
  }

  /** Visibility loss invalidates local time confidence; unsent records remain durable. */
  suspend() {
    if (this.status === "closed") return;
    this.generation++;
    this.abort?.abort();
    this.abort = null;
    this.inFlight = false;
    this.clearTimer();
    if (this.maintenance !== null) clearTimeout(this.maintenance);
    this.maintenance = null;
    this.status = "paused";
    this.emit();
  }

  async resume() {
    if (!this.owned || !this.store || ["closed", "storage-blocked", "terminal"].includes(this.status)) return;
    this.suspend();
    const generation = this.generation;
    const abort = new AbortController();
    this.abort = abort;
    this.inFlight = true;
    const started = this.monotonic();
    try {
      if (!this.prepareRecovery()) return;
      const snapshot = await this.request(this.dependencies.port.synchronize(structuredClone(this.journal), abort.signal), abort);
      if (generation !== this.generation) return;
      this.acceptSnapshot(snapshot, started);
      if (this.status !== "storage-blocked") {
        this.error = null;
        this.nextAttemptAt = 0;
        if (this.save({ ...this.journal, batches: this.journal.batches.map((batch) => ({ ...batch, attempts: 0 })) })) this.status = "ready";
      }
    } catch (error) {
      if (generation === this.generation) {
        if (error instanceof TapTransportError && error.snapshot) this.acceptSnapshot(error.snapshot, started);
        this.error = error instanceof TapTransportError ? error.code : "RESPONSE_INVALID";
        this.status = error instanceof TapTransportError && error.kind === "terminal" ? "terminal" : "paused";
        const retry = error instanceof TapTransportError ? Math.max(1500, error.retryAfterMs) : 3000;
        const needsNewCredentials = ["AUTH_MISSING", "AUTH_INVALID", "AUTH_EXPIRED"].includes(this.error);
        if (this.status === "paused" && !needsNewCredentials && Number.isFinite(retry) && retry <= 300_000) {
          this.nextAttemptAt = this.monotonic() + retry;
          this.maintain(retry);
        }
      }
    } finally {
      if (generation === this.generation) {
        this.inFlight = false;
        this.emit();
        if (this.status === "ready" && this.journal.events.length) this.schedule(0);
        if (this.status === "ready") this.maintain();
      }
    }
  }

  private prepareRecovery() {
    let journal = this.journal;
    const unassigned = this.unassigned();
    while (unassigned.length) {
      const first = unassigned.shift()!;
      const lease = journal.leases.find((item) => scopeId(item.scope) === scopeId(first.scope));
      if (!lease) continue; // Preserve unknown evidence; fresh state may recover its original lease.
      const events = [first];
      while (events.length < lease.batchLimit && unassigned[0]
        && scopeId(unassigned[0].scope) === scopeId(first.scope)
        && unassigned[0].sequence === events[events.length - 1].sequence + 1) events.push(unassigned.shift()!);
      journal = { ...journal, batches: [...journal.batches, { scope: first.scope, key: this.dependencies.requestKey?.() ?? crypto.randomUUID(),
        sequences: events.map((item) => item.sequence), attempts: 0, blocked: false }] };
    }
    return journal === this.journal || this.save(journal);
  }

  private save(next: TapJournal) {
    try {
      this.store!.write(next);
      this.journal = next;
      return true;
    } catch {
      this.status = "storage-blocked";
      this.clearTimer();
      this.emit();
      return false;
    }
  }

  /** Synchronous durable append precedes the immediate React notification. No HTTP wait. */
  touch(): boolean {
    const grant = this.grant;
    if (this.status !== "ready" || !this.snapshot?.earningAllowed || !grant || grant.cooldownDuration === null) return false;
    if (this.serverNow() >= grant.expiresAt) { this.status = "paused"; this.emit(); return false; }
    const pending = this.journal.events.filter((event) => scopeId(event.scope) === scopeId(grant.scope) && event.sequence > grant.sequenceCursor);
    if (pending.length >= grant.remaining || (this.snapshot.cooldownUntil ?? 0) > this.serverNow()) return false;
    // Rollover/revocation must be resolved by the server, never priced with the new grant.
    if (this.journal.events.some((event) => scopeId(event.scope) !== scopeId(grant.scope))) return false;
    const sequence = Math.max(grant.sequenceCursor, ...pending.map((event) => event.sequence)) + 1;
    if (!Number.isSafeInteger(sequence)
      || !Number.isSafeInteger(this.snapshot.lifetime + (pending.length + 1) * grant.pointsPerTouch)
      || !Number.isSafeInteger(this.snapshot.seasonPoints + (pending.length + 1) * grant.pointsPerTouch)) {
      this.status = "paused"; this.emit(); return false;
    }
    if (!this.save({ ...this.journal, events: [...this.journal.events, { scope: grant.scope, sequence }] })) return false;
    const previous = this.view.progression;
    const progression = authorizedProgression(this.snapshot.lifetime + (pending.length + 1) * grant.pointsPerTouch, grant.progression);
    if (previous && progression.level > previous.level) {
      this.levelChange = { sequence, previousLevel: previous.level, newLevel: progression.level,
        stage: progression.stage, evolved: progression.stage !== previous.stage };
    }
    if (pending.length + 1 >= grant.remaining) this.localCooldown = this.serverNow() + grant.cooldownDuration;
    this.emit();
    const unassigned = this.unassigned().length;
    this.schedule(unassigned >= grant.batchLimit ? 0 : Math.max(40, Math.min(400, this.roundTrip / 2)));
    return true;
  }

  private acceptSnapshot(input: TapSnapshot, started: number) {
    const next = snapshotSchema.parse(input);
    if (next.player !== this.dependencies.player) throw new TapTransportError("terminal");
    const stale = this.snapshot && next.season === this.snapshot.season && compareSnapshots(next, this.snapshot) < 0;
    if (!stale && this.grant && next.grant && scopeId(this.grant.scope) === scopeId(next.grant.scope)
      && (next.grant.sequenceCursor < this.grant.sequenceCursor || next.grant.remaining > this.grant.remaining)) {
      throw new TapTransportError("reauthorize");
    }
    const resolved = this.journal.batches.filter((batch) => next.receipts.some((receipt) => receipt.key === batch.key && scopeId(receipt.scope) === scopeId(batch.scope))
      || next.rejections.some((rejection) => rejection.key === batch.key && scopeId(rejection.scope) === scopeId(batch.scope)));
    for (const batch of resolved) {
      const receipt = next.receipts.find((item) => item.key === batch.key && scopeId(item.scope) === scopeId(batch.scope));
      if (receipt && (receipt.accepted + receipt.rejected !== batch.sequences.length
        || receipt.through !== batch.sequences[0] + receipt.accepted - 1)) throw new TapTransportError("reauthorize", 0, "RESPONSE_INVALID");
    }
    const resolvedIds = new Set(resolved.flatMap((batch) => batch.sequences.map((sequence) => `${scopeId(batch.scope)}:${sequence}`)));
    const journal = {
      ...this.journal,
      events: this.journal.events.filter((event) => !resolvedIds.has(`${scopeId(event.scope)}:${event.sequence}`)),
      batches: this.journal.batches.filter((batch) => !resolved.includes(batch)),
      resolved: [...this.journal.resolved, ...resolved.filter((batch) => next.rejections.some((item) => item.key === batch.key)
        || next.receipts.some((item) => item.key === batch.key && item.rejected > 0)).map((batch) => ({ scope: batch.scope, key: batch.key, sequences: batch.sequences,
          code: next.rejections.find((item) => item.key === batch.key)?.code ?? "PARTIAL_RECEIPT_REJECTED_TAIL" }))].slice(-64),
    };
    if (!stale && next.grant) {
      const pending = journal.events.filter((event) => scopeId(event.scope) === scopeId(next.grant!.scope) && event.sequence > next.grant!.sequenceCursor).sort((a, b) => a.sequence - b.sequence);
      if (pending.length > next.grant.remaining || pending.some((event, index) => event.sequence !== next.grant!.sequenceCursor + index + 1)) {
        // Storage is delivery evidence, never an authorization source.
        this.grant = null;
        throw new TapTransportError("reauthorize");
      }
    }
    const scopes = new Set(journal.events.map((event) => scopeId(event.scope)));
    const retainedGrant = stale ? this.grant : next.grant;
    journal.leases = this.journal.leases.filter((lease) => scopes.has(scopeId(lease.scope)) && scopeId(lease.scope) !== (retainedGrant && scopeId(retainedGrant.scope)));
    if (retainedGrant) journal.leases.push({ scope: retainedGrant.scope, batchLimit: retainedGrant.batchLimit, minBatchInterval: retainedGrant.minBatchInterval });
    if (!this.save(journal)) return;
    if (stale) return;
    this.snapshot = next;
    this.grant = next.grant;
    const displayedPending = next.grant ? journal.events.filter((event) => scopeId(event.scope) === scopeId(next.grant!.scope)
      && event.sequence > next.grant!.sequenceCursor).length * next.grant.pointsPerTouch : 0;
    const confirmedDisplay = authorizedProgression(next.lifetime + displayedPending, next.progression);
    if (this.levelChange && (this.levelChange.newLevel > confirmedDisplay.level || this.levelChange.stage !== confirmedDisplay.stage)) this.levelChange = null;
    const stillExhaustedLocally = next.grant && journal.events.filter((event) =>
      scopeId(event.scope) === scopeId(next.grant!.scope) && event.sequence > next.grant!.sequenceCursor).length >= next.grant.remaining;
    // Once accepted, the absolute server deadline replaces the provisional one.
    // A partial in-flight acknowledgement must not hide the still-exhausted local burst.
    if (next.cooldownUntil !== null || !stillExhaustedLocally) this.localCooldown = null;
    this.anchor = { server: next.serverTime + Math.max(0, this.monotonic() - started), monotonic: this.monotonic(), wall: this.wall() };
    this.dependencies.onCommitted?.(next);
  }

  private unassigned() {
    const assigned = new Set(this.journal.batches.flatMap((batch) => batch.sequences.map((sequence) => `${scopeId(batch.scope)}:${sequence}`)));
    return this.journal.events.filter((event) => !assigned.has(`${scopeId(event.scope)}:${event.sequence}`));
  }
  private clearTimer() { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; this.scheduledAt = Infinity; }
  private schedule(delay: number) {
    if (this.status !== "ready") return;
    const wait = Math.max(delay, this.nextAttemptAt - this.monotonic(), 0);
    const due = this.monotonic() + wait;
    if (this.timer !== null && this.scheduledAt <= due) return;
    this.clearTimer();
    this.scheduledAt = due;
    this.timer = setTimeout(() => { this.timer = null; this.scheduledAt = Infinity; void this.flush(); }, wait);
  }

  async flush() {
    if (this.inFlight || this.status !== "ready") return;
    this.clearTimer();
    if (this.monotonic() < this.nextAttemptAt) { this.schedule(this.nextAttemptAt - this.monotonic()); return; }
    let batch = this.journal.batches[0];
    if (!batch) {
      const events = this.unassigned();
      const first = events[0];
      if (!first) return;
      // Old-scope unsent events require explicit recovery by the adapter; no repricing.
      if (!this.grant || scopeId(first.scope) !== scopeId(this.grant.scope)) { this.status = "paused"; this.emit(); return; }
      const sequences = events.filter((event) => scopeId(event.scope) === scopeId(first.scope)).slice(0, this.grant.batchLimit).map((event) => event.sequence);
      try {
        batch = { scope: first.scope, key: this.dependencies.requestKey?.() ?? crypto.randomUUID(), sequences, attempts: 0, blocked: false };
      } catch { this.status = "paused"; this.emit(); return; }
      if (!this.save({ ...this.journal, batches: [...this.journal.batches, batch] })) return;
    }
    if (batch.attempts >= 6) { this.status = "paused"; this.emit(); return; }
    const attempt = { ...batch, attempts: batch.attempts + 1 };
    if (!this.save({ ...this.journal, batches: this.journal.batches.map((item) => item.key === batch.key ? attempt : item) })) return;
    const abort = new AbortController();
    this.abort = abort;
    this.inFlight = true;
    const generation = this.generation;
    const started = this.monotonic();
    let delay = 0;
    try {
      const snapshot = await this.request(this.dependencies.port.submit(structuredClone({ scope: attempt.scope, key: attempt.key, sequences: attempt.sequences }), abort.signal), abort);
      if (generation !== this.generation) return;
      this.roundTrip = Math.max(1, this.monotonic() - started);
      this.acceptSnapshot(snapshot, started);
      this.nextAttemptAt = this.monotonic() + (this.grant?.minBatchInterval ?? 0);
      if (this.journal.batches.some((item) => item.key === attempt.key)) throw new TapTransportError("reauthorize");
    } catch (error) {
      if (generation !== this.generation) return;
      if (this.maintenance !== null) clearTimeout(this.maintenance);
      this.maintenance = null;
      const kind = error instanceof TapTransportError ? error.kind : "retry";
      this.error = error instanceof TapTransportError ? error.code : "TEMPORARY_UNAVAILABLE";
      if (kind === "terminal" || kind === "reauthorize") {
        const resolved = error instanceof TapTransportError && error.definitive;
        const durable = kind !== "terminal" || this.save(resolved ? { ...this.journal,
          batches: this.journal.batches.filter((item) => item.key !== attempt.key),
          events: this.journal.events.filter((event) => scopeId(event.scope) !== scopeId(attempt.scope) || !attempt.sequences.includes(event.sequence)),
          resolved: [...this.journal.resolved, { scope: attempt.scope, key: attempt.key, sequences: attempt.sequences, code: this.error }].slice(-64),
        } : { ...this.journal, batches: this.journal.batches.map((item) => item.key === attempt.key ? { ...item, blocked: true } : item) });
        if (kind === "terminal") this.levelChange = null;
        if (durable) this.status = kind === "terminal" && !resolved ? "terminal" : "paused";
        if (resolved) this.maintain(500);
      }
      else {
        const retryAfter = error instanceof TapTransportError ? error.retryAfterMs : 0;
        // Do not shorten a long server rate-limit window to a convenient client cap.
        if (!Number.isFinite(retryAfter) || retryAfter < 0 || retryAfter > 300_000) this.status = "paused";
        else {
          const jitter = this.dependencies.retryJitterMs?.() ?? Math.random() * 250;
          delay = Math.max(Math.min(30_000, 500 * 2 ** (attempt.attempts - 1)), retryAfter)
            + (Number.isFinite(jitter) ? Math.min(250, Math.max(0, jitter)) : 0);
          this.nextAttemptAt = this.monotonic() + delay;
        }
      }
    } finally {
      if (generation === this.generation) {
        this.inFlight = false;
        this.emit();
        if (this.journal.events.length) this.schedule(delay);
        else if (this.status === "ready") this.maintain();
      }
    }
  }

  close() {
    this.suspend();
    this.status = "closed";
    this.dependencies.ownership.release();
    this.owned = false;
    this.emit();
    this.listeners.clear();
  }

  dismissLevelChange() { this.levelChange = null; this.emit(); }
}
