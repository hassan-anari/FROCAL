/** Player-facing recovery categories. Never render transport details or raw codes. */
export function sessionRecovery(code: string | null, status?: string) {
  if (status === "storage-blocked" || code === "STORAGE_UNAVAILABLE") return {
    label: "SESSION ISSUE", title: "We couldn't save your game session",
    message: "Please check your device's storage settings and try again.", reopen: false,
  };
  if (["AUTH_MISSING", "AUTH_INVALID", "AUTH_EXPIRED", "AUTH_REJECTED", "LAUNCH_DATA_MISSING"].includes(code ?? "")) return {
    label: "OPEN TELEGRAM", title: "Please reopen Dexo Land",
    message: "Close the Mini App and open it again from Telegram to continue.", reopen: true,
  };
  if (code === "ACTIVE_SESSION") return {
    label: "ACTIVE SESSION", title: "You're already playing on another device",
    message: "Dexo Land can only be open on one device at a time. Close the game on your other device, then try again here.", reopen: false,
  };
  if (["GENERATION_STALE", "LEASE_REVOKED"].includes(code ?? "")) return {
    label: "SESSION MOVED", title: "Your game is open on another device",
    message: "It looks like you switched devices. To continue here, close the game on your other device and try again.", reopen: false,
  };
  if (status === "session-busy" && code !== "LOCAL_SESSION_UNAVAILABLE") return {
    label: "ACTIVE TAB", title: "Your game is open in another tab",
    message: "Close the game in your other tab, then try again here.", reopen: false,
  };
  if (["LOCAL_SESSION_UNAVAILABLE", "JOURNAL_INVALID", "JOURNAL_CHANGED"].includes(code ?? "")) return {
    label: "SESSION ISSUE", title: "We couldn't resume your game session",
    message: "Close the game in any other tabs and try again.", reopen: false,
  };
  return {
    label: "CONNECTION ISSUE", title: "Having trouble connecting",
    message: "We couldn't connect to Dexo Land right now. Check your connection and try again.", reopen: false,
  };
}
