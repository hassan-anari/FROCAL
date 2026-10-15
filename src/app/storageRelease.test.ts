import { afterEach, expect, it } from "vitest";
import { CLIENT_STORAGE_RELEASE, migrateClientRelease } from "./storageRelease";
afterEach(() => localStorage.clear());
it("invalidates reconstructible old demo reads once while preserving onboarding and all economic evidence", () => {
  const preserved = {
    "dalexio-onboarding-v1:player:42": "completed-device-preference",
    "dalexio-onboarding-v1": "completed-original-device-preference",
    "dalexio-tap-v2:42": "pending-original-key-and-sequences",
    "dalexio-base-tap-queue:42": "unresolved-legacy-request",
    "dalexio-base-tap-daily:42": "untrusted-counters-preserved-for-review",
    "unknown-owner-preference": "preserve",
  };
  localStorage.setItem("dalexio-client-storage-release", "b1");
  for (const [key, value] of Object.entries(preserved)) localStorage.setItem(key, value);
  for (const key of ["dalexio-earn-state-v2", "dalexio-clan-state-v1", "dalexio-base-ui"]) localStorage.setItem(key, "old-demo");
  expect(migrateClientRelease(localStorage)).toBe(true);
  for (const [key, value] of Object.entries(preserved)) expect(localStorage.getItem(key)).toBe(value);
  expect(localStorage.getItem("dalexio-earn-state-v2")).toBeNull();
  expect(localStorage.getItem("dalexio-client-storage-release")).toBe(CLIENT_STORAGE_RELEASE);
  localStorage.setItem("dalexio-earn-state-v2", "new-local-fixture");
  expect(migrateClientRelease(localStorage)).toBe(false);
  expect(localStorage.getItem("dalexio-earn-state-v2")).toBe("new-local-fixture");
});

it.each(["b1", "b2-1", "b3-1", null])("preserves both accounts, completed onboarding and old outboxes upgrading from %s", (old) => {
  if (old) localStorage.setItem("dalexio-client-storage-release", old);
  const evidence = {
    "dalexio-onboarding-v1:player:42": "completed",
    "dalexio-onboarding-v1:player:99": "in-progress",
    "dalexio-tap-v2:42": "pending-journal",
    "dalexio-tap-v2:99": "other-device-journal",
    "dalexio-base-tap-queue:42": "unresolved-v1-outbox",
    "dalexio-motion-preference": "reduce",
  };
  for (const [key, value] of Object.entries(evidence)) localStorage.setItem(key, value);
  migrateClientRelease(localStorage);
  for (const [key, value] of Object.entries(evidence)) expect(localStorage.getItem(key)).toBe(value);
});

it("leaves an offline/storage-denied device unchanged without claiming a migration succeeded", () => {
  const storage = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  expect(migrateClientRelease(storage)).toBe(false);
});
