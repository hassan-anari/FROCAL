import { scopeId, snapshotSchema, TapTransportError, type TapBatch, type TapGrant, type TapJournal, type TapPort, type TapSnapshot } from "./model";
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
}

/** Inactive infrastructure until a reviewed B2 adapter supplies server authorization. */
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
    this.journal = { version: 1, player: dependencies.player, events: [], batches: [] };
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
    const pending = this.grant && this.status !== "terminal" ? this.journal.events.filter((event) => scopeId(event.scope) === scopeId(this.grant!.scope)).length : 0;
    const points = pending * (this.grant?.pointsPerTouch ?? 0);
    const lifetime = this.snapshot ? this.snapshot.lifetime + points : null;
    return {
      status: this.status, committed: this.snapshot, authorizedUnsent: pending,
      lifetime, seasonPoints: this.snapshot ? this.snapshot.seasonPoints + points : null,
      remaining: this.grant ? Math.max(0, this.grant.remaining - pending) : 0,
      progression: lifetime !== null && this.snapshot ? authorizedProgression(lifetime, this.snapshot.progression) : null,
      cooldownUntil: this.localCooldown ?? this.snapshot?.cooldownUntil ?? null,
      levelChange: this.levelChange,
    };
  }
  private emit() { this.view = this.calculate(); for (const listener of this.listeners) listener(); }

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
    if (this.status !== "initializing") return;
    const acquired = await this.dependencies.ownership.acquire();
    if (this.status !== "initializing") { this.dependencies.ownership.release(); return; }
    if (!acquired) { this.status = "session-busy"; this.emit(); return; }
    this.owned = true;
    try {
      this.store = new TapJournalStore(this.dependencies.storage(), this.dependencies.player);
      this.journal = this.store.read();
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
      const snapshot = await this.request(this.dependencies.port.synchronize(structuredClone(this.journal), abort.signal), abort);
      if (generation !== this.generation) return;
      this.acceptSnapshot(snapshot, started);
      if (this.status !== "storage-blocked") {
        this.nextAttemptAt = 0;
        if (this.save({ ...this.journal, batches: this.journal.batches.map((batch) => ({ ...batch, attempts: 0 })) })) this.status = "ready";
      }
    } catch (error) {
      if (generation === this.generation) this.status = error instanceof TapTransportError && error.kind === "terminal" ? "terminal" : "paused";
    } finally {
      if (generation === this.generation) {
        this.inFlight = false;
        this.emit();
        if (this.status === "ready" && this.journal.events.length) this.schedule(0);
      }
    }
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
    if (this.status !== "ready" || !this.snapshot?.earningAllowed || !grant) return false;
    if (this.serverNow() >= grant.expiresAt) { this.status = "paused"; this.emit(); return false; }
    const pending = this.journal.events.filter((event) => scopeId(event.scope) === scopeId(grant.scope));
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
    if (this.snapshot && next.revision < this.snapshot.revision) return;
    if (this.snapshot && next.revision === this.snapshot.revision
      && (next.lifetime !== this.snapshot.lifetime || next.seasonPoints !== this.snapshot.seasonPoints
        || next.season !== this.snapshot.season || next.config !== this.snapshot.config)) throw new TapTransportError("terminal");
    if (this.grant && next.grant && scopeId(this.grant.scope) === scopeId(next.grant.scope)
      && (next.grant.sequenceCursor < this.grant.sequenceCursor || next.grant.remaining > this.grant.remaining)) {
      throw new TapTransportError("reauthorize");
    }
    const acknowledged = (scope: TapBatch["scope"], sequence: number) =>
      (next.grant !== null && scopeId(next.grant.scope) === scopeId(scope) && sequence <= next.grant.sequenceCursor)
      || next.acknowledgements.some((ack) => scopeId(ack.scope) === scopeId(scope) && sequence <= ack.through);
    // A request key always keeps its exact original payload until fully acknowledged.
    for (const batch of this.journal.batches) {
      const accepted = batch.sequences.filter((sequence) => acknowledged(batch.scope, sequence)).length;
      if (accepted !== 0 && accepted !== batch.sequences.length) throw new TapTransportError("reauthorize");
    }
    const journal = {
      ...this.journal,
      events: this.journal.events.filter((event) => !acknowledged(event.scope, event.sequence)),
      batches: this.journal.batches.filter((batch) => !batch.sequences.every((sequence) => acknowledged(batch.scope, sequence))),
    };
    if (next.grant) {
      const pending = journal.events.filter((event) => scopeId(event.scope) === scopeId(next.grant!.scope)).sort((a, b) => a.sequence - b.sequence);
      if (pending.length > next.grant.remaining || pending.some((event, index) => event.sequence !== next.grant!.sequenceCursor + index + 1)) {
        // Storage is delivery evidence, never an authorization source.
        this.grant = null;
        throw new TapTransportError("reauthorize");
      }
    }
    if (!this.save(journal)) return;
    this.snapshot = next;
    this.grant = next.grant;
    this.localCooldown = null;
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
      if (this.journal.batches.some((item) => item.key === attempt.key)) throw new TapTransportError("reauthorize");
    } catch (error) {
      if (generation !== this.generation) return;
      const kind = error instanceof TapTransportError ? error.kind : "retry";
      if (kind === "terminal" || kind === "reauthorize") {
        const durable = kind !== "terminal" || this.save({ ...this.journal, batches: this.journal.batches.map((item) => item.key === attempt.key ? { ...item, blocked: true } : item) });
        if (kind === "terminal") this.levelChange = null;
        if (durable) this.status = kind === "terminal" ? "terminal" : "paused";
      }
      else {
        const retryAfter = error instanceof TapTransportError ? error.retryAfterMs : 0;
        // Do not shorten a long server rate-limit window to a convenient client cap.
        if (!Number.isFinite(retryAfter) || retryAfter < 0 || retryAfter > 300_000) this.status = "paused";
        else {
          delay = Math.max(Math.min(30_000, 500 * 2 ** (attempt.attempts - 1)), retryAfter);
          this.nextAttemptAt = this.monotonic() + delay;
        }
      }
    } finally {
      if (generation === this.generation) {
        this.inFlight = false;
        this.emit();
        if (this.journal.events.length) this.schedule(delay);
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
