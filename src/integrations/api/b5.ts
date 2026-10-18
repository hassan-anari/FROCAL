import { governanceReason } from "./governance";
import { z } from "zod";
import { apiRequest, ApiError } from "./client";
import * as c from "./postB6Schemas";
const errorSchema = z.object({ code: z.string(), retryable: z.boolean().optional(), retry_after_seconds: z.number().nullable().optional() });
export class ClanApiError extends Error {
  constructor(readonly code: string, readonly status: number, readonly retryable = false, readonly retryAfter: number | null = null) {
    super(governanceReason(code) ?? (status === 403 ? "This Clan action isn't available to your account." : code === "CLAN_RECREATION_BLOCKED" ? "A Captain cannot found another Clan in the same Season." : code === "CLAN_OWNER_DECISION_REQUIRED" ? "This Clan action is awaiting a product decision." : "Your Clan couldn't be updated. Please refresh and try again."));
  }
}
async function request<T>(initData: string | null, path: string, schema: z.ZodType<T>, options: { method?: "GET" | "POST" | "DELETE"; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  const response = await apiRequest(`/clans${path}`, { initData, method: options.method ?? "GET", signal: options.signal, cache: "no-store", returnErrorResponse: true, ...(options.body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(options.body) }) });
  if (!response.ok) {
    const error = errorSchema.safeParse(await response.json().catch(() => null));
    throw new ClanApiError(error.success ? error.data.code : "UNAVAILABLE", response.status, error.success && error.data.retryable === true, error.success ? error.data.retry_after_seconds ?? null : null);
  }
  const value = response.status === 204 ? null : await response.json();
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(0, "RESPONSE_INVALID");
  return result.data;
}
const clanResponse = c.ClanOut.required({ level: true, score: true, state: true });
const reference = (id: number) => String(z.number().int().positive().safe().parse(id));
/** Exact implemented WEDCAL B6 paths. Callers own intentional mutation/replay keys;
 * no optimistic membership, Treasury, inventory, rewards or governance transitions. */
export function clanApi(initData: string | null) {
  const get = <T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal) => request(initData, path, schema, { signal });
  const post = <T>(path: string, schema: z.ZodType<T>, body?: unknown) => request(initData, path, schema, { method: "POST", body });
  return {
    state: (signal?: AbortSignal) => get("/state", c.StateOut, signal),
    role: (body: c.RoleIn) => post("/role", c.RoleOut, c.RoleIn.parse(body)),
    eligibleGroups: (signal?: AbortSignal) => get("/eligible-groups", z.array(c.GroupOut), signal),
    verifyGroup: (id: number) => post(`/eligible-groups/${reference(id)}/verify`, c.GroupOut),
    create: (body: c.ClanCreateIn) => post("/", clanResponse, c.ClanCreateIn.parse(body)),
    discover: (q: string, offset = 0, signal?: AbortSignal) => get(`/?q=${encodeURIComponent(q)}&offset=${z.number().int().nonnegative().parse(offset)}&limit=20`, z.array(clanResponse), signal),
    preview: (id: number, signal?: AbortSignal) => get(`/${reference(id)}`, clanResponse, signal),
    join: (id: number) => post(`/${reference(id)}/join-requests`, c.RequestOut),
    ownRequests: (signal?: AbortSignal) => get("/join-requests/current", z.array(c.OwnRequestOut), signal),
    cancelRequest: (id: number) => request(initData, `/join-requests/${reference(id)}`, c.RequestOut, { method: "DELETE" }),
    revokeRequest: (id: number) => post(`/join-requests/${reference(id)}/revoke`, c.RequestOut),
    applicants: (signal?: AbortSignal) => get("/applicants", z.array(c.ApplicantOut), signal),
    decision: (id: number, body: c.DecisionIn) => post(`/join-requests/${reference(id)}/decision`, c.RequestOut, c.DecisionIn.parse(body)),
    membership: (signal?: AbortSignal) => get("/membership/current", c.MembershipOut.nullable(), signal),
    // Invite credentials must stay memory-only and be opened through safe Telegram navigation.
    invite: (signal?: AbortSignal) => get("/invite/current", c.InviteOut, signal),
    home: (signal?: AbortSignal) => get("/home", c.ClanHomeOut, signal),
    roster: (offset = 0, signal?: AbortSignal) => get(`/roster?offset=${z.number().int().nonnegative().parse(offset)}&limit=50`, c.RosterPage, signal),
    treasury: (signal?: AbortSignal) => get("/treasury", c.TreasuryOut, signal),
    activity: (cursor: string | null = null, signal?: AbortSignal) => get(`/activity?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, c.ClanActivityPage, signal),
    equipment: (signal?: AbortSignal) => get("/equipment", c.EquipmentOut, signal),
    purchase: (item: string, idempotencyKey: string) => post(`/shop/${encodeURIComponent(item)}/purchase`, c.MutationOut, c.IdempotencyIn.parse({ idempotency_key: idempotencyKey })),
    activate: (item: string, idempotencyKey: string) => post(`/inventory/${encodeURIComponent(item)}/activate`, c.MutationOut, c.IdempotencyIn.parse({ idempotency_key: idempotencyKey })),
    missions: (signal?: AbortSignal) => get("/missions", z.array(c.ClanMissionOut), signal),
    trophies: (signal?: AbortSignal) => get("/trophies", z.array(c.TrophyOut), signal),
    governance: (signal?: AbortSignal) => get("/governance", z.array(c.GovernanceOut), signal),
    recovery: (signal?: AbortSignal) => get("/recovery", c.RecoveryOut, signal),
    verifyAuthority: () => post("/recovery/verify", c.RecoveryOut),
    leave: () => post("/leave", z.null()),
    removalCase: (body: c.RemovalCaseIn) => post("/removal-cases", c.GovernanceOut, c.RemovalCaseIn.parse(body)),
    vote: (id: number, body: c.VoteIn) => post(`/governance/${reference(id)}/vote`, c.GovernanceOut, c.VoteIn.parse(body)),
    dissolve: () => post("/dissolution", c.GovernanceOut.nullable()),
  };
}
