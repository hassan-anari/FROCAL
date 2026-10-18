import type { GovernanceCapabilitiesOut } from "../src/integrations/api/postB6Schemas";
/** Synthetic UI timing variants of the published post-B6 schema. Actual pairing uses HTTP. */
export function governanceFixture(outcome: "IMMEDIATE" | "VOTE_REQUIRED" | "BLOCKED" = "IMMEDIATE"): GovernanceCapabilitiesOut {
  return { config_version: "isolated-ui", config_checksum: "isolated-ui-checksum", minimum_eligible_voters: 3, quorum_bps: 4000, approval_bps: 6000, vote_duration_hours: 24,
    dissolution: { can_open: outcome !== "BLOCKED", blocked_reason: outcome === "BLOCKED" ? "CLAN_GOVERNANCE_INSUFFICIENT_VOTERS" : null, eligible_count: outcome === "IMMEDIATE" ? 1 : outcome === "BLOCKED" ? 2 : 4, existing_case_id: null, direct: outcome === "IMMEDIATE", outcome, same_season_recreation_allowed: false, confirmation_warning: "Dissolution permanently ends this ClanSeason. You cannot create another Clan in the same Season." }, removal_targets: [] };
}
