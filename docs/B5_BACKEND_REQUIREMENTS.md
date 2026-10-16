# B5 frontend API requirements — P-10 / P-11 / P-12

Status: awaiting the WEDCAL B5 implementation handoff. This is a consumer inventory, not a proposed wire contract. One FROCAL draft covers all B5 integration and approved UI corrections. No merge/deployment.

## Provenance and boundary

- FROCAL approved baseline: `ef6f1fc` (latest merged main when work began).
- WEDCAL main inspected: `6aaa362daecec86107babd95224398e7e1ac7e75`.
- Read `CLAN_FRONTEND_SCOPE.md`, `CLAN_REDESIGN_V2_REPORT.md`, `PHASE_5_CLAN_REPORT.md`, ClanPage/ClanOverlays, existing Design System and assets.
- Read WEDCAL `AGENTS.md`, Source of Truth §§22–35, and `DEXO_LAND_CROSS_REPO_INTEGRATION_CONTRACT.md` §§5/P-10–P-12, 10, D-08. The latest owner task authorizes B5; older register wording that B5 is unauthorized is historical.
- WEDCAL's existing `apps/clans/api.py` is historical implementation, not a published B5 contract. No B5 branch/PR/contract/fixture handoff was present at inspection. Historical paths below describe that source only.

## Concrete data and action needs

| Approved surface | Required server authority | Historical API gap to resolve in B5 |
|---|---|---|
| LockedClan / RoleChoice / RoleConfirmSheet | Configured unlock level, authenticated eligibility, season-persistent Captain/Soldier choice, mutation pending/error/replay and state after reload | `/clans/state` has role/eligibility/cooldown but no complete membership/request snapshot. Do not infer eligibility solely from a feature flag. |
| CaptainFounding group selection | Backend-known eligible group record; stable selection ID, title, username/photo, verification/admin readiness; registration revalidates user and bot authority, uniqueness and season | `GroupOut.id` is a database PK while create field is named `telegram_group_id`; explicitly define semantics. Existing fields omit photo and verification metadata. No manual chat ID or trusted client admin booleans. |
| Captain identity form | Accepted name/tag/motto rules, accent persistence or explicit unsupported decision, stable Clan identity and canonical post-create state | Existing create schema has no accent. Never manufacture HQ level/capacity/score after create. |
| SoldierNetwork / ClanCard / FeaturedClan / ClanPreviewSheet | Paged server discovery/search/preview, identity, roster/capacity/reservations, HQ level/score/rank/status, availability; exact query and continuation semantics | Existing `ClanOut` omits HQ level, artwork state, suggestions/match semantics; no dedicated preview snapshot. Omit unsupported recommendation percentages rather than inventing them, subject to UI owner decision. |
| PendingJoinCard / applicant decisions | Stable request ID and clan reference, pending/rejected/cancelled/accepted state, single active request rule; own request read, cancel, decision replay/conflict/error | Historical request mutation returns ID/state but `/state` does not expose own request. Do not treat Captain acceptance as active membership. |
| JoinRequestsSheet | Request ID, authorized applicant identity/photo, level, season points, safe rank/activity/medal/contribution preview fields; pagination and accept/reject permissions | Historical applicants omit photo, rank, active days, medals, contribution preview. Do not display mock replacements for absent evidence. |
| Clan Home / roster | Own stable membership ID, Clan/season identity, access state, role, authoritative roster IDs and fields, capacity and membership transitions after Telegram verification | Historical MembershipOut lacks membership ID; ContributionOut lacks player/membership IDs, level/photo. Group access, invite credentials and game membership are distinct. |
| HQ / Treasury / personal contribution | Current HQ state/threshold/progress/max, competitive score/rank, Treasury balance/history, individual and total gross contribution; coherent revisions and invalidation dependencies | Existing home supplies many metrics, but display currently invents history, forecasts, facility counts and rotating HQ states. B5 must define unavailable fields and real snapshots. |
| Shop / ClanItemSheet | Stable item IDs mapped to approved art, exact configured price/description/effect/availability, purchase/use permissions and reason; authoritative result, idempotency/replay/conflict rules | Historical ShopItemOut lacks description/category/rarity/duration; do not substitute catalog demo economics. Defence/context S2 items must not become purchasable/active in S1. |
| Inventory / ActiveEffectsStrip | Exact quantity, active effects with server start/end and time reference, activation mode/availability, purchase/activation result with post-mutation state or explicit refetch requirements | No active effects read in historical API. Activation result is only mutation ID/replayed; no client quantity decrement, balance debit or duration calculation. |
| Group/individual tasks / Trophy Hall | Exact mission windows/progress/status/rewards; group/individual separation; actual earned achievements and progress/history | Missions expose reward band rather than display reward; trophy read absent. Never render simulated XP/trophies. |
| Existing BasePromoBanner | Properly validated external HTTPS destinations on arbitrary domains, preserved query strings; Telegram/internal links retain their existing safe routing | Current frontend already accepts arbitrary external HTTPS and uses Telegram `openLink`. Confirm B5 server contract parity; no host allowlist added. |

## Required contract handoff

Publish actual implemented schemas/OpenAPI, generated success/error/transition fixtures, configuration/version rules, feature flags/migrations, backward compatibility, canonical rewards/progression adoption, cache scope/revision rules, server timestamps, authorization and idempotency/concurrency tests. Provide the exact immutable implementation SHA and handoff documents. No speculative endpoint names or fixture values will be bound.

After handoff, create **separate** `scripts/contracts/b5-pin.json` with actual source/fixture blob hashes and a paired checkout at that exact SHA, following B2/B3/B4. Preserve all historical pins and fixture bytes. No placeholder commit or B4-as-B5 pin.

## Exact UI gaps requiring owner decision before new surfaces

| Gap | Existing approved surface | Required decision |
|---|---|---|
| Cancel pending request | PendingJoinCard is status-only; preview has one disabled pending CTA | Approve placement/action for cancellation. No extra button added. |
| Accepted invite / delivery pending / expired / revoked / verification | PendingJoinCard supports only pending/rejected; store diagnostics jumps directly to HQ | Approve how existing sheet/status conveys accepted-but-not-active and credential recovery, including safe Telegram action. No invite URL logging or persistence. |
| Leave eligibility, consequences, cooldown and limits | No leave action or confirmation in ClanPage/ClanOverlays | Approve exact surface and confirmation within existing hierarchy. Backend supplies restrictions; no invented cooldown. |
| Removal case, voter eligibility, quorum/deadline/result | Roster is display-only; no case/vote UI | Approve case initiation and voting surface. No unrestricted kick or additional role. |
| Captain inactivity / recovery vote / dissolution | Only recovery HQ artwork and visual state concept exist; no explanatory or decision UI | Approve recovery/dissolution presentation and action mapping. No client timer deciding outcomes. |
| Bot/group-admin loss, inaccessible group, emergency release, rejoin | No access/recovery/credential surface | Approve recovery/error presentation and available actions based on actual backend states. |
| Unsupported mock fields / S2 items | Match percentages, facilities, history, forecast metrics, applicant samples, full Defence catalog | Decide representation of absent data and locked unavailable items while preserving approved art/layout. Do not relabel mock values as confirmed data. |

Owner decisions are needed only for these concrete gaps, not for the already approved A1–A4 corrections. Until B5 handoff and those decisions, P-10/P-11/P-12 remain incomplete and must not be activated using local Clan state.

## Paired acceptance to execute after handoff

Captain and Soldier role persistence, eligible selection/admin loss/stale group/duplicate binding; join/cancel/reject/accept/DM/Telegram verification and refresh; cross-user/clan authorization; capacity and duplicate decisions; leave/cooldown and historical contribution; all governance/recovery/dissolution/access-loss paths; invite expiry/revocation; concurrency/idempotency/response-loss for Treasury/shop/inventory/effects; exact mission rewards/trophies; season transitions, profile/Network/Arena regressions and B2/B3/B4 compatibility. Physical Telegram WebView acceptance remains separate from Chromium fixture evidence.
