// A deliberate storage compatibility release, not a Git SHA or asset build hash.
export const CLIENT_STORAGE_RELEASE = "b2-1";
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
if (typeof localStorage !== "undefined") migrateClientRelease(localStorage);
