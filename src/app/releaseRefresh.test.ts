import { afterEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CLIENT_STORAGE_RELEASE, hasPendingTapEvidence } from "./storageRelease";
afterEach(() => localStorage.clear());
it("publishes the intentional storage compatibility marker rather than a build SHA", () => {
  expect(JSON.parse(readFileSync("public/client-release.json", "utf8")).storage_compatibility).toBe(CLIENT_STORAGE_RELEASE);
});
it("allows an acknowledged fresh device but blocks any account's unresolved economic evidence", () => {
  expect(hasPendingTapEvidence(localStorage)).toBe(false);
  localStorage.setItem("dalexio-tap-v2:42", JSON.stringify({ events: [], batches: [] }));
  expect(hasPendingTapEvidence(localStorage)).toBe(false);
  localStorage.setItem("dalexio-tap-v2:99", JSON.stringify({ events: ["pending"], batches: [] }));
  expect(hasPendingTapEvidence(localStorage)).toBe(true);
  localStorage.removeItem("dalexio-tap-v2:99");
  localStorage.setItem("dalexio-base-tap-queue:42", "legacy-unconfirmed");
  expect(hasPendingTapEvidence(localStorage)).toBe(true);
});
it("blocks unsafe automatic refresh on malformed evidence or unavailable storage", () => {
  localStorage.setItem("dalexio-tap-v2:42", "malformed");
  expect(hasPendingTapEvidence(localStorage)).toBe(true);
  expect(hasPendingTapEvidence({ get length(): number { throw new Error("denied"); }, key: () => null, getItem: () => null })).toBe(true);
});
it("revalidates HTML and version metadata while preserving immutable static asset caching and disabling branch deployment", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  expect(config.headers.find((entry: { source: string }) => entry.source === "/(.*)").headers[0].value).toContain("must-revalidate");
  expect(config.headers.find((entry: { source: string }) => entry.source === "/client-release.json").headers[0].value).toBe("no-store");
  expect(config.headers.find((entry: { source: string }) => entry.source === "/assets/(.*)").headers[0].value).toContain("immutable");
  expect(config.git.deploymentEnabled["ai/b3-frontend-integration"]).toBe(false);
});

it("does not permanently block refresh on empty or exactly receipt-confirmed legacy queues", () => {
  const key = "dalexio-base-tap-queue:42";
  localStorage.setItem(key, JSON.stringify({ buffer: 0, pending: null }));
  expect(hasPendingTapEvidence(localStorage)).toBe(false);
  localStorage.setItem(key, JSON.stringify({ buffer: 0, pending: { idempotencyKey: "original", tapCount: 7 } }));
  expect(hasPendingTapEvidence(localStorage)).toBe(true);
  localStorage.setItem(`${key}:v2-recovery`, JSON.stringify({ marker: JSON.stringify(["original", 7, 0]), resolution: { status: "receipt-confirmed", requestKey: "original", unassignedTouches: 0 } }));
  expect(hasPendingTapEvidence(localStorage)).toBe(false);
  localStorage.setItem(key, JSON.stringify({ buffer: 1, pending: { idempotencyKey: "original", tapCount: 7 } }));
  expect(hasPendingTapEvidence(localStorage)).toBe(true);
});
