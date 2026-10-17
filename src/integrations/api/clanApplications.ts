import type { OwnRequestOut } from "./b5Schemas";

/** Server metadata owns blocking and Season handling; history order grants no action. */
export function selectClanApplications(requests: readonly OwnRequestOut[]) {
  const blocks = (row: OwnRequestOut) => row.blocks_new_application || row.credential_unresolved || row.is_active;
  const blockingRequests = requests.filter(blocks);
  const history = requests.filter(row => !blocks(row));
  const unique = blockingRequests.length === 1 ? blockingRequests[0] : null;
  const actionable = unique !== null && unique.blocks_new_application && unique.is_active && unique.is_current_season
    && unique.handling === "CURRENT_SEASON" && (unique.state === "PENDING" || unique.state === "ACCEPTED");
  return {
    activeRequest: actionable ? unique : null,
    operatorRequest: unique && !actionable ? unique : null,
    blockingRequests, history,
    ambiguous: blockingRequests.length > 1,
    operatorRequired: unique !== null && !actionable,
    blocksNewApplication: blockingRequests.length > 0,
  };
}

export const applicationStatusMessage = {
  loading: "Loading Clan requests…",
  error: "Clan requests couldn't load. Refresh status to try again.",
  overlap: "Your Clan requests need review before you can continue. Refresh your status or contact support.",
  operator: "This request needs help from support before you can continue. Refresh your status after it is resolved.",
} as const;
