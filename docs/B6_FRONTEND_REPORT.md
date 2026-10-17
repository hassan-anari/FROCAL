# Batch 6 frontend implementation — backend handoff pending

Draft [PR #9](https://github.com/hassan-anari/FROCAL/pull/9), branch `ai/b6-frontend-integration`, from merged routing-fix main `f7324b07cda2ede8d55679457699ad376d03447d`. [Audit of owner-confirmed issues](B6_AUDIT.md). This is the schema-independent portion authorized by the owner; final Batch 6 API integration is pending WEDCAL's published contract and exact runtime SHA.

## Implemented

- Clan entry resolves server eligibility, role, membership and Soldier applications before selecting the destination. The existing animated AppLoader uses approved Clan HQ artwork, with reduced-motion support and accessible announcements. No application delay, invented transition or optimistic membership is added.
- Raw B5 async text in Clan entry/HQ, discovery, candidates, preview, request review, Status and Earn History uses existing loading/card/modal/button treatments. Persistent failures have Retry; empty states remain inside their existing surfaces. Confirmed HQ content survives background read failures. Definitive membership authorization denial hides protected content; stale dependent actions stay disabled.
- Status is right-aligned in the existing header, 36px high and approximately 102px wide, with installed Hugeicons `SquareActivityIcon`. The existing Status modal remains. Captain registration is scoped to 46px; shared Buttons and artwork remain unchanged.
- TanStack Query retains authenticated scope isolation. Membership, own applications and Captain applicants poll at 15s; HQ, Treasury, inventory/effects, missions, roster, discovery/capacity, candidates, governance and recovery at 30s. Native Telegram activation, window focus and visibility changes coalesce into one active-query refresh. Hidden-window interval behavior remains TanStack's default. Search requests are debounced. Mutations stay locked during reconciliation; a failed refresh cannot report a confirmed write as failed or repeat it.
- Captain registration consumes only server candidates and supplied photos/counts, keeps approved avatar fallbacks and fresh verification metadata, and offers group refresh after bot/admin changes. Registration and group exclusivity remain server-owned.
- Public `VITE_TELEGRAM_BOT_URL` selects the Test/Production bot for Clan and Profile sharing/reopening. Clan Add Bot strips inherited payloads and opens a neutral group/admin link. Remote Network registration still uses the server-issued signed `startgroup_url`. Missing/invalid configuration fails closed; set the approved public URL in each build environment. No bot credential or Telegram launch data is added to configuration.
- Status uses understandable request, invitation, cancellation, recovery and governance labels. PENDING remains a request; ACCEPTED reserves capacity and still requires Telegram verification. Legacy/older unsafe paths retain persistent support guidance and read-only discovery, with all join/invite/cancel actions blocked. Invitation links remain disposable modal memory, excluded from Query and browser storage.
- Earn Network History and its existing sheet allow only canonical `CREATOR` and `NETWORK_SPEAKER` settlements, verified in pinned WEDCAL `apps/network/services.py`. Pagination/deduplication remain server-cursor based; all-filtered pages can continue and failed continuation can retry. Base and the shared general reward cache remain unfiltered.
- Unsupported mission requirements no longer become editorial instructions. Unknown display metadata uses safe unavailable copy until the backend publishes real titles/descriptions. No mission Claim control or client settlement is added. The HQ log retains real Treasury entries with readable labels and an integrated empty state until the new feed is available.
- Treasury/HQ use canonical whole balance, history, score, contribution and actual HQ XP. Zero Treasury and 0% progress at 0 HQ XP remain correct with nonzero score/contribution. Backend fractional accumulation is never duplicated on the client.

## Backend-dependent work

| Integration | Required handoff |
| --- | --- |
| Applicant global Season rank and Daily current streak | Final fields, null semantics, authoritative fixtures and B6 pin. Existing null metrics are not populated speculatively. |
| Real HQ Recent Activity | Authorized feed response, pagination/event labels/timestamps and fixtures. Current log remains Treasury-only; no demo events in Remote mode. |
| Admin Group/Individual mission display | Exact title, description, requirement/reward display metadata and supported semantics. Existing progress/economics remain server-owned. |
| Clan Standing consistency | Authoritative rank in the finalized Clan ranking contract. Owner's Dexo Caln example must show #1 once that data is published; score never determines rank locally. |
| B6 economic and invite policy changes | Final runtime/contract and actual paired tests, including fractional Treasury credits and no private invite-URL messages. Existing Mini App open-group flow is retained. |

The unchanged integration pin remains **WEDCAL B5 `65a2c45810c0d5f721c662f3d4681967829ef242`**. B2/B3/B4 historical pins and all pinned fixture/source bytes are preserved. No B6 schema, endpoint, fixture or runtime is guessed. Once the owner supplies the final B6 handoff, update an exact verified pin and complete those integrations and paired acceptance in this same batch.

## Validation

The branch contains regression coverage for each corrected loading/error/empty surface, initial destination gating, stale HQ preservation, authorization denial, committed-write/refetch failure separation, duplicate-write prevention, polling bounds, native/focus refresh coalescing, invitation storage safety, unsafe request paths, bot configuration, candidate photos/count fallbacks, 46px registration, Network-only pagination/retry and zero Treasury/HQ progress.

Final command results and exact-head hosted conclusions are recorded in the PR validation section. The [visual report](B6_VISUAL_REPORT.md) includes immutable-main before/after evidence at 320, 390 and 460px, computed control sizes and screenshot/source hashes. Existing broad app, B4/B5 visual and historical paired gates remain enabled in CI; new B6 visual/functional checks are added to that workflow.

## Preserved boundaries

API origin/proxy and Vercel trailing/non-trailing routing are unchanged. Base Next Objectives, approved layouts, artwork, card hierarchy, navigation, modal structure, reward reveals and Season 2 locked states are retained. No backend code, production data/economy, live Telegram send, merge or deployment is performed. This Draft is not full B6 acceptance until the backend-dependent rows and final paired gate are complete.
