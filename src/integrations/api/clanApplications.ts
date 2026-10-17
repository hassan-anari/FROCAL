import type { OwnRequestOut } from "./b5Schemas";

/** Request history order never decides which application owns an active reservation. */
export function selectClanApplications(requests: readonly OwnRequestOut[]) {
  const active = requests.filter(request => request.state === "PENDING" || request.state === "ACCEPTED");
  const history = requests.filter(request => request.state !== "PENDING" && request.state !== "ACCEPTED");
  return { activeRequest: active.length === 1 ? active[0] : null, history, ambiguous: active.length > 1 };
}

export const applicationStatusMessage = {
  loading: "Loading Clan requests…",
  error: "Clan requests couldn't load. Refresh status to try again.",
  overlap: "More than one active Clan request was returned. Refresh status before continuing.",
} as const;
