# B5 active-application review correction

One existing FROCAL Draft [PR #6](https://github.com/hassan-anari/FROCAL/pull/6), branch `ai/b5-clan-frontend`. This is the targeted independent-review correction. No merge, deployment, live Telegram send, new feature batch or B6.

## Corrected frontend behavior

The authenticated own-request response is explicitly partitioned by lifecycle state. Exactly one PENDING or ACCEPTED record is actionable, regardless of history order. DECLINED, CANCELLED, ACTIVATED and other historical records are read-only. A newer cancelled or declined record never replaces an older accepted invitation.

Loading/read errors and overlapping active records block joins. Legacy overlaps select no Clan and expose no credential, cancellation or invented resolution. The existing Clan status/Refresh status presentation remains. The accepted invitation stays accessible through the approved ClanModal; terminal history uses the existing detail rows after active controls. Credentials remain in disposable modal memory, bound to authenticated scope, application identity and lifecycle. Old and late responses cannot expose a credential after ambiguity or scope/state changes.

Cancellation retains the active application until authoritative terminalization; actual membership reads switch to HQ after Telegram verification. Existing typed HTTP 409 CLAN_STATE_CONFLICT uses the existing feedback and refreshes authenticated queries. No request switching, automatic cancellation/replacement, optimistic membership or fabricated server transition.

## Runtime coordination and final gate

The old B5 pin `c38a7a65ba9bacce53a04bec6c10dfbeb71ed008` is retained pending the final corrected handoff. Runtime `70f27ec73b926e969c77341f2db98edaba48dcab` corrects transactional writes but still caps the newest 20 current-Season records in the own-request read. It can omit an older accepted invitation behind 25 newer terminal records and older-Season active records.

The owner independently confirmed this correctness blocker and [instructed WEDCAL Draft #30 to fix it](https://github.com/hassan-anari/WEDCAL/pull/30#issuecomment-6227580941). The authenticated read must include all global PENDING/ACCEPTED reservations independently of terminal-history limits, retaining detectable legacy overlaps. The frontend cannot recover omitted application/credential identity safely. No larger client limit or guessed credential request substitutes for this contract.

Per the owner's explicit instruction, do not update the B5 pin or run final paired acceptance until the corrected runtime SHA and handoff are published. Then refresh exact source/schema/HTTP fixture blobs, including the published single-application fixture, and run all six required CI jobs and full paired PostgreSQL/API/mobile-browser validation. Preserve B2/B3/B4 pins. Record final frontend/backend SHAs and hosted results before independent owner review.

## Regression coverage and evidence

- 17 selector/hook/modal tests: PENDING/ACCEPTED behind newer terminal rows in either order; terminal history; all overlapping combinations; authenticated loading/read error guards; accepted access through ClanModal; cancellation-pending retention; actual membership-read activation; typed conflict feedback; cache/storage credential exclusion; late-response fencing.
- Paired real-API tests require independent pending/accepted blocking, cross-Clan concurrency, older accepted/newer cancelled-and-declined ordering, visibility beyond the history limit, failed revocation retention, authoritative cancellation and verified activation. Legacy rows are explicitly isolated database setup; production HTTP responses are not fabricated.
- Mobile tests at 320/390/460 retain the original five Captain/Soldier/governance/economy scenarios and add accepted/history/cancellation/activation, cross-device conflicts and safe legacy overlap cases. Final screenshots must be regenerated against the corrected pin.
- Before the environment restart, local runs passed 282 unit tests, 134 broad browser tests, 12 B5 correction/visual tests, five existing Clan scenarios and four targeted request/overlap scenarios. Those pre-handoff results do not substitute for final exact-pin acceptance. The fresh workspace re-runs checks and retains the original published B5 baseline/evidence without relabeling it as the new correction.

No CSS, artwork, shared avatar/Button/Toast/reward component, Base/Earn/Network/Profile/Arena view, role permanence, eligibility or locked Season 2 behavior changes in this correction.

PH-048 is owner-deferred to Season 2 after the first officially confirmed Clan War victory, at most once per ClanSeason, per documentation decision `b171fd9b5ecaa750288281e3ec7c5c09ba1a87c2`. Season 1 remains UNAVAILABLE with null progress/target and no reward. No Season 2 logic is implemented.
