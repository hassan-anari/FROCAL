import { journalSchema, type TapJournal } from "./model";

export interface DurableStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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
    if (this.expected === null) return { version: 1, player: this.player, events: [], batches: [] };
    if (this.expected.length > 256_000) throw new Error("Journal exceeds bound");
    const journal = journalSchema.parse(JSON.parse(this.expected));
    if (journal.player !== this.player) throw new Error("Journal player mismatch");
    return journal;
  }

  write(journal: TapJournal) {
    const next = JSON.stringify(journalSchema.parse(journal));
    if (next.length > 256_000) throw new Error("Journal exceeds bound");
    if (this.storage.getItem(this.key) !== this.expected) throw new Error("Journal changed outside exclusive session");
    this.storage.setItem(this.key, next);
    if (this.storage.getItem(this.key) !== next) throw new Error("Journal durability not confirmed");
    this.expected = next;
  }
}
