import type { BootstrapPayload } from "@/game/domain/schemas";
import type { RemoteBootstrap } from "./bootstrapContract";

export function bootstrapServerNow(data: BootstrapPayload | undefined): number {
  if (!data) return NaN;
  return Date.parse(data.serverTime) + Math.max(0, performance.now() - (data.clockReceivedAt ?? performance.now()));
}

/** Only a server grant can enable earning. Elapsed server dates can only stop it. */
export function seasonAvailability(payload: RemoteBootstrap | undefined, now: number) {
  const season = payload?.season;
  const start = Date.parse(season?.starts_at ?? "");
  const end = Date.parse(season?.ends_at ?? "");
  const economicEnd = Date.parse(season?.timing?.economic_ends_at ?? "");
  const closed = !season || ["CLOSED", "ARCHIVED"].includes(season.status) || now >= end;
  const closing = !closed && season?.status === "ACTIVE" && now >= economicEnd;
  const active = !closed && season?.status === "ACTIVE" && !(now < start);
  const earning = active && !closing && (payload?.gameplay?.reward_earning_allowed ?? true);
  const status = closed ? season?.status === "ARCHIVED" ? "ARCHIVED" : "CLOSED"
    : closing ? "CLOSING" : earning ? "EARNING ACTIVE" : season?.status === "ACTIVE" ? "EARNING UNAVAILABLE" : season?.status ?? "UNAVAILABLE";
  // The reviewed claim endpoints settle server-vested obligations during ACTIVE,
  // including Closing. Each operation still requires its own server read evidence.
  const vestedClaims = active && (!payload?.gameplay || ["ACTIVE", "FLAGGED"].includes(payload.gameplay.moderation_state));
  return { earning, vestedClaims, status, closing, closed, start, end, economicEnd };
}
