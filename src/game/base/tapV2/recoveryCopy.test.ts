import { expect, it } from "vitest";
import { sessionRecovery } from "./recovery";

it("distinguishes another device, a moved session, a local tab, unavailable storage and expired authentication", () => {
  expect(sessionRecovery("ACTIVE_SESSION")).toMatchObject({ label: "ACTIVE SESSION", title: "You're already playing on another device" });
  for (const code of ["GENERATION_STALE", "LEASE_REVOKED"]) expect(sessionRecovery(code).label).toBe("SESSION MOVED");
  expect(sessionRecovery(null, "session-busy").label).toBe("ACTIVE TAB");
  expect(sessionRecovery("LOCAL_SESSION_UNAVAILABLE", "session-busy").label).toBe("SESSION ISSUE");
  expect(sessionRecovery("JOURNAL_INVALID", "terminal").title).toBe("We couldn't resume your game session");
  expect(sessionRecovery("STORAGE_UNAVAILABLE", "storage-blocked")).toMatchObject({ title: "We couldn't save your game session", message: "Please check your device's storage settings and try again." });
  expect(sessionRecovery("AUTH_EXPIRED")).toMatchObject({ label: "OPEN TELEGRAM", reopen: true });
});

it.each(["LEASE_EXPIRED", "COOLDOWN", "RATE_LIMITED", "TEMPORARY_UNAVAILABLE", "RESPONSE_INVALID", "UNKNOWN_FUTURE_CODE", null])("never mislabels ordinary recovery %s as another device", (code) => {
  const copy = sessionRecovery(code);
  expect(copy).toMatchObject({ label: "CONNECTION ISSUE", title: "Having trouble connecting", message: "We couldn't connect to Dexo Land right now. Check your connection and try again." });
  expect(JSON.stringify(copy)).not.toContain(code ?? "INTERNAL");
});
