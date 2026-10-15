// A deliberate storage compatibility release, not a Git SHA or asset build hash.
export const CLIENT_STORAGE_RELEASE = "b3-1";
const marker = "dalexio-client-storage-release";
const reconstructible = ["dalexio-earn-state-v2", "dalexio-clan-state-v1", "dalexio-base-ui"];
export function migrateClientRelease(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, release = CLIENT_STORAGE_RELEASE) {
  try {
    if (storage.getItem(marker) === release) return false;
    for (const key of reconstructible) storage.removeItem(key);
    // Preserve all Onboarding/device preferences, pending economic journals and unknown keys.
    storage.setItem(marker, release);
    return true;
  } catch { return false; } // Tap's own durability checks fail closed independently.
}
// Some WebViews throw even when obtaining the Storage object. Startup must still
// reach the diagnosed Tap recovery state instead of crashing during module load.
try { if (typeof localStorage !== "undefined") migrateClientRelease(localStorage); }
catch { /* Optional client cache migration; Tap diagnoses its own durability. */ }

/** Conservative refresh guard, including other accounts and unresolved v1 evidence. */
export function hasPendingTapEvidence(storage: Pick<Storage, "length" | "key" | "getItem">) {
  try {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      if (key.startsWith("dalexio-tap-v2:")) {
        const journal = JSON.parse(raw);
        if (!Array.isArray(journal.events) || !Array.isArray(journal.batches)
          || journal.events.length || journal.batches.length) return true;
      }
      if (key.startsWith("dalexio-base-tap-queue:") && !key.endsWith(":v2-recovery")) {
        const queue = JSON.parse(raw);
        if (!Number.isSafeInteger(queue.buffer) || queue.buffer < 0 || queue.buffer > 0) return true;
        if (queue.pending === null) continue;
        if (!queue.pending || typeof queue.pending.idempotencyKey !== "string" || !Number.isSafeInteger(queue.pending.tapCount)) return true;
        const proof = JSON.parse(storage.getItem(`${key}:v2-recovery`) ?? "null");
        const marker = JSON.stringify([queue.pending.idempotencyKey, queue.pending.tapCount, queue.buffer]);
        if (proof?.marker !== marker || proof?.resolution?.status !== "receipt-confirmed"
          || proof.resolution.requestKey !== queue.pending.idempotencyKey || proof.resolution.unassignedTouches !== 0) return true;
      }
      if (key.startsWith("dalexio-base-tap-buffer:")) return true;
    }
    return false;
  } catch { return true; }
}

export function readSessionPreference(key: string) { try { return sessionStorage.getItem(key); } catch { return null; } }
export function writeSessionPreference(key: string, value: string) { try { sessionStorage.setItem(key, value); } catch { /* optional presentation preference */ } }
