/** Published post-B6 business codes. Never display arbitrary exception detail. */
const reasons: Record<string, string> = {
  CLAN_GOVERNANCE_INSUFFICIENT_VOTERS: "There are not enough eligible voters. Review the required and current voter counts before trying again.",
  CLAN_GOVERNANCE_OPEN_CASE_EXISTS: "A case of this type is already open. Review the existing case.",
  CLAN_GOVERNANCE_INVALID_TARGET: "This member cannot be proposed for removal. Refresh the roster and select a current Soldier.",
  CLAN_GOVERNANCE_INVALID_REMOVAL_REASON: "Select a supported removal reason.",
  CLAN_GOVERNANCE_RECOVERY_RESTRICTED: "This action is unavailable during Clan recovery. Review the recovery status.",
  CLAN_GOVERNANCE_CLAN_ENDED: "This Clan has already ended. Refresh Clan Status.",
  CLAN_GOVERNANCE_SEASON_UNAVAILABLE: "This Clan's Season is not active. Refresh Clan Status.",
  CLAN_GOVERNANCE_STATE_CONFLICT: "This action is unavailable in the current Clan state. Refresh Clan Status.",
  CLAN_GOVERNANCE_POLICY_UNAVAILABLE: "The Clan's governance policy is unavailable. Contact support.",
  CLAN_GOVERNANCE_VOTING_CLOSED: "Voting has closed. Refresh the case to see its status.",
  CLAN_GOVERNANCE_VOTE_ALREADY_CAST: "Your vote has already been submitted. Refresh the case.",
  CLAN_GOVERNANCE_INVALID_VOTE: "Choose a valid vote.",
  CLAN_GOVERNANCE_INVALID_CASE_TYPE: "This governance action is unavailable. Refresh Clan Status.",
  CLAN_GOVERNANCE_CASE_NOT_DUE: "This case has not reached its voting deadline.",
  CLAN_FORBIDDEN: "This Clan action isn't available to your account.",
  SEASON_UNAVAILABLE: "The current Season is unavailable. Refresh Clan Status.",
};
export function governanceReason(code: string | null | undefined) { return code ? reasons[code] ?? null : null; }
