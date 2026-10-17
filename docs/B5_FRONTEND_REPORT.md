# B5 frontend implementation report

One coordinated FROCAL Draft [PR #6](https://github.com/hassan-anari/FROCAL/pull/6), branch `ai/b5-clan-frontend`, from merged main **`ef6f1fca4de541e6eb45c9b8bf3e114bbd163cfb`**. No merge, deployment or live Telegram send.

The approved Clan P-10/P-11/P-12 UI now consumes the actual WEDCAL B5 APIs. The owner explicitly approved **reuse of existing ClanModal** for the missing cancellation, accepted-invite/verification, leave, removal/voting and recovery/dissolution states. That approval is implemented; it is no longer a blocker.

## Final active-application integration

The reviewed runtime `65a2c45810c0d5f721c662f3d4681967829ef242` resolves the prior read/write blockers. The frontend consumes all authoritative blocking, credential and original Season metadata before selecting one current-Season actionable request. Terminal-labelled unresolved credentials and older-Season paths require read-only operator status; multiple blocking paths fail closed. [Correction policy and evidence](B5_ACTIVE_APPLICATION_REVIEW.md).

## Implemented behavior

- **P-10:** Server eligibility and immutable seasonal role; server-known group candidates, fresh Telegram authority verification and registration; actual discovery/search/preview; join/pending/rejected/accepted/cancellation lifecycle; actual Captain applicant review; verified membership, Clan identity, HQ and paginated roster. Acceptance alone never creates local membership. Historical mock/Zustand state remains isolated to local diagnostics and cannot grant production access.
- **P-11:** The existing ClanModal shows actual request/invite/delivery/revocation state, access loss/rejoin deadline, leave limits/cooldown/contribution consequences, removal proposals with real roster membership IDs and backend reason codes, server electorate/quorum/deadline, immutable own vote and final result, all independent recovery reasons, Captain authority loss, fresh Captain-only Telegram authority verification, admin integrity/deadline and dissolution. Backend state machines own all transitions; no client outcome timer, role, instant kick, succession or extra approval is invented. Credentials stay in disposable modal memory and only active validated Telegram links can open.
- **P-12:** Exact HQ level/threshold/progress/max state, capacity, score, Treasury/history, own contribution, published shop/equipment prices and permissions, actual quantities/uses, activation and effective effects/expiry, real mission progress/participant payout state and Trophy Hall. Static catalog maps artwork/editorial copy only. Durable opaque economic intent keys survive uncertain responses and reloads, stay stable across configuration refresh and separate memberships/actions. Confirmed responses refresh server queries; no optimistic production balance, purchase, trophy or XP is displayed.
- **A1:** Inspected actual Earn avatar/container/image and shared AvatarContent before editing. The group-only loaded-photo class removes the initials gradient behind real images after successful load. Before border/shadow were already zero. Preserves 34px at 320 / 38px at 390/460, 13px corners, image bytes/crop, pending background and failed/missing initials. Shared avatar styles remain unchanged.
- **A2:** Only Network Group Expansion CTA changes from 64.3125px to **46px**, trailing container 34px. Same full width/gradient/arrow/label/rounding/Telegram action; shared Button unchanged.
- **A3:** Notification Center glyph uses visible flattened order `01`, `02`, … across continuation. UUIDs still identify backend mutations. Styling/read state/content/time/navigation and Toast icons remain.
- **A4:** Banner-specific strict URL parity with the actual B5 contract: arbitrary valid external HTTPS hosts/queries, declared HTTPS versus TELEGRAM opener, rejection of credentials/unsafe schemes/ports/fragments/controls/nested or malformed escaping/confusing paths. General safeNavigation rules remain unchanged. Same banner UI, aspect ratio, image validation, placement and loading/error lifecycle.
- **Earn History:** Existing History action and HistorySheet use authenticated `/rewards/history`, actual source/context/signed player XP/time, server cursor pagination, overlap deduplication, loading/empty/error/partial-error and retry on reopening. No fabricated mission title or local production history.
- **Base objectives:** Up to three actual available actionable `/missions` rows, stably prioritized REWARD_READY → IN_PROGRESS → AVAILABLE. Real title/status/reward; fewer rows when appropriate; no invented percentage. Same Timeline/All Missions navigation, solid turquoise/orange/gold numbered circles.
- **Recent Rewards:** Fictional last-visit entries removed. Existing card styling shows up to three real nonzero ledger XP records/category/context/time; hidden without confirmed history. Earn and Base share the authenticated player/session/season/config-scoped cache. Canonical reward receipts invalidate it without leaking another scope.

## Backend provenance and boundaries

| Batch | Exact pin |
|---|---|
| B2 | `34328c76ba3377396660b1549bf8e370ac514a71` |
| B3 | `c3f8f27d18fda66b62e22c6cadd1480e1f0f4370` |
| B4 | `75992805c1df2235a7513ddd6aa5864df65dd5c3` |
| B5 | **`65a2c45810c0d5f721c662f3d4681967829ef242`** |

Historical B2/B3/B4 pin/source/fixture bytes are preserved. The separate B5 pin records actual source/fixture Git blobs; Zod schemas are generated from its actual OpenAPI with a drift gate. The planning-only SHA was never an implementation pin. WEDCAL [Draft #30](https://github.com/hassan-anari/WEDCAL/pull/30) owns backend implementation and independent final backend review; this consumer binds and tests the published implemented runtime above.

[API needs and resolution](B5_BACKEND_REQUIREMENTS.md) map every frontend need to the actual contract. **PH-045 is resolved in the latest handoff:** same-season Captain recreation stays blocked; original-Captain authority loss and fresh permission verification are bound, with independent recovery causes preserved; **PH-048** is owner-deferred to Season 2 after the first officially confirmed Clan War victory, at most once per ClanSeason (`b171fd9b5ecaa750288281e3ec7c5c09ba1a87c2`). Season 1 remains UNAVAILABLE with null progress/target and no reward. No Season 2 behavior is implemented. No frontend workaround changes them. Unsupported rank/match/facility/applicant metrics remain dashes/absent. The existing founding identity tone persists as a cosmetic preference scoped to the verified player and confirmed Clan ID; it never grants an entitlement or becomes shared server identity. The API publishes name/tag/motto/group identity rather than an accent field. Captain applicants are the published pending-only list; the frontend does not invent accepted-request management or access to another player's credentials.

## Validation and evidence

Local verified components against the exact pin:

- `npm run check`: **43 files / 293 unit tests**, TypeScript, structure/assets/import/motion validators, 12 production-policy checks, all historical/current pin/schema drift checks, release build and production bundle exclusion passed. There is no standalone ESLint command; these are the configured static/lint checks. Official Telegram SDK hash/SRI and actual backend OpenAPI export check passed.
- **267 actual backend Clan PostgreSQL tests** passed, including the complete active/unsafe visibility and independent governance/recovery/economy/concurrency cases.
- **19 real client/API and fresh-schema paired checks** passed, including 26 newer terminal records, older-Season active reservations, terminal credential risk, mixed blockers, explicit authorized proof, legacy overlap, actual membership and credential cleanup, permissions and economic idempotency.
- **13 actual mobile Clan scenarios** passed at 320/390/460, retaining Captain/Soldier founding through economy/governance and adding metadata-driven operator/ambiguous/resolution cases. **75 Clan screenshots**, including **24 targeted correction screenshots**, record exact source hashes, backend pin and viewports in [the validation manifest](evidence/b5/validation-manifest.json).
- The complete final paired command and all six final-head CI jobs are required. The PR description publishes the final frontend SHA, exact run URL and job conclusions. The hosted browser job retains 134 broad app regressions, 17 B4 and 12 B5 browser/visual checks; dedicated B2/B3/B4 pairing preserves compatibility. Previous green heads are not substituted for final acceptance.

`docs/evidence/b5/{320,390,460}/` contains matching approved-main before/after A corrections, real photographic fixture and fallback cases, computed dimensions and provenance. The photo is an unmodified public-domain NASA image used as a deterministic real-image fixture, not an owner group photo. `docs/evidence/b5/clan/` contains immutable approved-source diagnostic design references and actual pinned-runtime mobile states. Historical diagnostic numbers are explicitly baseline samples; production screenshots use actual isolated API responses. Paired credentials/launch URLs are excluded from traces/screenshots; no real Telegram send occurs.

[UI preservation matrix](B5_UI_PRESERVATION.md) records the authorized deltas and preserved art/navigation/overlays/locked Season 2. [Changed-file inventory](B5_CHANGED_FILES.md) lists the exact batch scope. Chromium mobile/official-SDK evidence does not claim physical Telegram-device certification. Independent owner review remains the next release decision; PR stays Draft and unmerged.
