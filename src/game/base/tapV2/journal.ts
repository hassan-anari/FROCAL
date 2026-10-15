import { journalSchema, type TapJournal } from "./model";

export interface DurableStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class JournalIntegrityError extends Error {
  constructor(readonly code: "JOURNAL_INVALID" | "JOURNAL_CHANGED") { super(code); }
}

/** One bounded document per verified player; unresolved old leases stay intact. */
export class TapJournalStore {
  private expected: string | null;
  readonly key: string;
  constructor(private storage: DurableStorage, readonly player: string) {
    this.key = `dalexio-tap-v2:${encodeURIComponent(player)}`;
    this.expected = storage.getItem(this.key);
  }

  read(): TapJournal {
    if (this.expected === null) return journalSchema.parse({ version: 1, player: this.player, events: [], batches: [] });
    try {
      if (this.expected.length > 256_000) throw new JournalIntegrityError("JOURNAL_INVALID");
      const journal = journalSchema.parse(JSON.parse(this.expected));
      if (journal.player !== this.player) throw new JournalIntegrityError("JOURNAL_INVALID");
      return journal;
    } catch { throw new JournalIntegrityError("JOURNAL_INVALID"); }
  }

  write(journal: TapJournal) {
    const next = JSON.stringify(journalSchema.parse(journal));
    if (next.length > 256_000) throw new Error("Journal exceeds bound");
    if (this.storage.getItem(this.key) !== this.expected) throw new JournalIntegrityError("JOURNAL_CHANGED");
    this.storage.setItem(this.key, next);
    if (this.storage.getItem(this.key) !== next) throw new Error("Journal durability not confirmed");
    this.expected = next;
  }
}
