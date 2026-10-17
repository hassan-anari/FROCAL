const labels: Record<string, string> = {
  CAPTAIN: "Captain", SOLDIER: "Soldier", ACTIVE: "Active", ACCESS_LOST: "Group access needs verification",
  PENDING: "Awaiting Captain review", ACCEPTED: "Accepted · verify Telegram membership", DECLINED: "Declined", CANCELLED: "Cancelled", ACTIVATED: "Membership verified",
  CREATING: "Preparing invitation", UNCERTAIN: "Invitation needs review", REVOKE_PENDING: "Cancelling invitation", REVOKE_FAILED: "Cancellation needs review", REVOKED: "Invitation closed", MANUAL_REVIEW: "Support review needed",
  RECOVERY: "Recovery", CLOSED: "Closed", DISSOLVED: "Dissolved", INACTIVE: "Inactive", OPEN: "Open", YES: "Yes", NO: "No",
  CAPTAIN_AUTHORITY_LOSS: "Captain admin permissions need restoring", BOT_ADMIN_LOSS: "Bot admin permissions need restoring", CAPTAIN_INACTIVITY: "Captain activity needs recovery", BOT_ADMIN_MISSING: "Bot admin permissions need restoring",
  ABUSIVE_BEHAVIOR: "Abusive behavior", SPAM: "Spam", HARASSMENT: "Harassment", SABOTAGE: "Sabotage", COMMUNITY_REASON: "Community concern", OTHER: "Other",
  ENDED: "Ended", SOLDIER_REMOVAL: "Soldier removal", CAPTAIN_DISSOLUTION: "Captain dissolution", RECOVERY_DISSOLUTION: "Recovery dissolution",
  REMOVAL: "Member removal", MEMBER_REMOVAL: "Member removal", DISSOLUTION: "Clan dissolution", APPROVED: "Approved", REJECTED: "Rejected", EXPIRED: "Expired", EXECUTED: "Completed", PASSED: "Approved", FAILED: "Not approved",
};
export const clanStatusLabel = (value: string | null | undefined) => value ? labels[value] ?? "Needs review" : "Not available";
export function invitationLabel(state: string | null | undefined) {
  return state === "ACTIVE" ? "Ready to open" : state ? clanStatusLabel(state) : "Not ready yet";
}
