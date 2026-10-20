# Phase 4 frontend contract synchronization

This additive pin is independent of all historical B1/B2/B3/B4/B5/B6/post-B6 pins.
FROCAL starts at `eb76307615322016bc39509c467f64be0268423a` (latest main when work began).
WEDCAL Draft PR #38 is pinned at `cdd0aa372889956868708ba2c02bd29db5c1e1b7`.
The exact backend handoff and Bootstrap/Mission DTO source snapshots are retained here.
The source/fixture Git blob hashes are in `../phase4-pin.json`.

| Area | Consumer behavior |
| --- | --- |
| Bootstrap timing | Optional/null legacy compatibility; complete present object required; integer/range and supplied date consistency checks. No topology fallback. Timing, Season boundaries, GameConfig identity and server denial survive canonical updates and scoped cache turnover. |
| Earning and claims | Backend earning grant plus supplied Season/window bounds. Countdown can stop stale controls, never authorize earning or award XP. Daily, Tap, Typing start/submit, Mission start/verify and Network registration stop when earning is forbidden. Supported Typing wallet and REWARD_READY Mission claims remain accessible during ACTIVE Closing; every settlement remains a backend request. Closed/Archived stop new earning and claims while preserving read/navigation access and backend feature flags. |
| Presentation | Arena uses authoritative Season title/status, product progress and economic countdown. Profile uses the current Season title. The approved locked Season 2 Warfront preview remains locked and retains its copy. No CSS, layout, color, spacing, motion or asset changes. |
| Configurable Missions | Every server key remains visible. INTERNAL supports only the reviewed typing-session/complete-profile semantics. TELEGRAM requires a safe Telegram destination. TIMED_EXTERNAL requires a safe HTTPS external/Telegram destination. Unsupported navigation is unavailable; verified REWARD_READY claims do not depend on knowing navigation semantics. Reward amounts and final receipts remain server-owned. |

The client uses the Bootstrap server timestamp plus monotonic elapsed time, preserving that
clock sample across canonical updates. Background resume pauses economic actions until a fresh
Bootstrap response. Earlier server-time responses cannot replace newer Bootstrap authority.
Economic rejection cancels any older in-flight Bootstrap read and refreshes authority. Action
locks and existing server idempotency remain in place. No local reward fallback is introduced.
Tap input shares the same earning gate as the UI. Its authenticated controller remains alive
after earning stops so exact durable requests can reconcile. Lease scope, ownership, journal
identity, pointer authority and receipt validation remain unchanged; no fresh lease is requested
when the frontend earning gate is closed. A pending-sync message distinguishes saved events from
server-confirmed progression during Closing.

The old full-page Season gate is removed: lack of an earning Season is not a reason to hide
historical records, confirmed balances or ordinary navigation. When Bootstrap returns no active
Season after Close, the existing read-only Arena state supplies the backend-ordered archived
Season identity; rankings are requested explicitly for that identity. No archive selector is added.
Authentication, backend feature availability, and existing Tap recovery remain enforced.

## Isolated paired checks

Install the existing `scripts/contracts/requirements.txt` in a disposable Python environment,
then run `npm run test:paired:phase4`. Python loads only the exact copied DTO declarations;
it does not initialize backend models, create a database, make HTTP requests or mutate WEDCAL.
The same JSON fixtures are validated by the frontend Zod contract and action tests:

- `registered-2.json` and `registered-6.json` are byte-for-byte copies of the backend's actual
  registered-policy Bootstrap inspection fixtures at the pinned SHA.
- `configurable-3.json` is a synthetic 17=3×5+2 timing variant of that DTO, not a published policy.
- `missions.json` contains synthetic schema-valid known/unknown keys, safe/unsafe destinations
  and unsupported internal semantics. They are not production Mission definitions.

`npm run validate:contracts` verifies the new pin alongside every unchanged historical pin.
`npm run check` runs repository lint/structure/import/motion/asset/policy checks, TypeScript,
all unit tests, the production build and bundle policy checks. This repository has no separate
ESLint configuration or lint script; its existing static validators are used.
`npm run test:e2e:phase4` runs the release build with isolated Playwright API routes on mobile
and desktop. The browser suite covers all three topologies, exact cutoff, Closing, reload,
resume, claim confirmation/deduplication, Closed/Archived readability and unknown Missions.
Existing browser/analytics/B4/B5/B6/post-B6 coverage remains enabled in CI. Visual comparisons
mask only the authorized Profile Season eyebrow and Arena intro sentence, in both the pinned
baseline and current rendering; their surrounding design still undergoes pixel comparison.
New browser assertions separately verify the authoritative title/state copy.
B6/post-B6 Base preservation comparisons supply the same eligible objective to both pinned
and current releases and assert its title. Every Base pixel remains compared; dedicated
320/390/460 regressions cover the authorized removal of empty objectives separately.

## Final owner corrections

Base renders the entire Next Objective section only for eligible titled rows, in the existing
stable priority order and with a maximum of three. REWARD_READY survives `available: false`
because new-start availability does not revoke a vested obligation. Pending/failed reads never
become completion copy; failed reads use existing transient feedback and a later read can recover.

Telegram Start intentionally returns no destination. Opening a new TELEGRAM Mission requires
a successful matching Start, followed by a successful list refresh with the same key, version,
verification family and destination. Only a safe Telegram URL from that list is opened through
the adapter. IN_PROGRESS has a small Open Telegram action beside Verify; reopening refreshes
the matching definition without another Start. Native failure reports that opening failed and
leaves retry/Verify available. Membership, readiness, Claim and reward settlement remain server
operations. TIMED_EXTERNAL keeps its Start destination, open token and dwell verification.

Referral Copy/Share invitations use the existing `referral` feature and shared earning gate,
including a fresh check inside each handler. Historical referral reads remain available.

### Tap cutoff protocol limit

Tap wire evidence stays pinned to WEDCAL B2 `34328c76ba3377396660b1549bf8e370ac514a71`;
the Phase 4 timing pin remains `cdd0aa372889956868708ba2c02bd29db5c1e1b7`. The reviewed
Phase 4 implementation in `apps/base_tap/v2.py` caps lease expiry at the economic/epoch boundary.
`submit_batch` finds an existing exact-key receipt before eligibility, expiry or rollover checks.
Thus a batch committed before cutoff but with a lost response can be replayed after cutoff
without another credit. Without an existing receipt, server arrival at/after cutoff fails
eligibility (SEASON_UNAVAILABLE), or an expired lease fails LEASE_EXPIRED. The client event
contains only lease scope and sequence, with no trusted proof of when the physical touch occurred.

The prior frontend earning-dependent provider closed/aborted the controller at cutoff, removed
its authorized pending display and left durable events unreconciled until earning became enabled
again. The correction stops input synchronously while allowing in-flight responses, exact replay,
authoritative rejection and subsequent state reads. Unknown/ambiguous evidence and its original
request identity remain durable across reload. Definitive server rejection is retained with its
key and sequences in the existing resolved journal; it never becomes earned XP. Saved unresolved
events are identified as awaiting confirmation. No client time, backdating, expiry extension,
new lease, re-keying or local reward fallback is used to settle them.

**Unresolved backend dependency:** a valid locally journaled touch that was never committed
before the server cutoff cannot be guaranteed credit under this protocol. The frontend safely
obtains rejection; it cannot promise conservation of provisional displayed XP. Guaranteeing that
product promise requires an explicitly reviewed backend protocol with durable server evidence
of pre-cutoff acceptance/reservation and final per-request outcomes after Close. Accepting client
timestamps or a blanket post-cutoff grace period would not establish that proof. No such backend
change or unsafe frontend workaround is included here.

Focused coverage includes pending, in-flight, committed-response-lost, expired-lease and reload
cases, matching/changed Mission definitions, native failure, and 320/390/460 objective/Mission
layouts. Run the existing Tap unit suites and `npm run test:e2e:phase4` before complete CI.

## Remaining backend contract gaps

1. `MissionOutput` exposes verification family and destination, but no internal action/route
   discriminator. A new INTERNAL key cannot be safely navigated from this DTO. The frontend
   retains the row and shows Unavailable until reviewed semantics are supplied. New external
   keys with supported verification families and safe destinations work without a key allowlist.
2. The reviewed claim services preserve vested obligations, but the reads do not expose a
   universal per-operation `claim_allowed` field. Typing uses positive server `claimable_balance`
   and Mission uses `REWARD_READY`, within the reviewed ACTIVE Season claim window and account
   eligibility. Daily `claimable` alone is not vested authority and never bypasses earning denial.
3. `list_missions` enumerates enabled/current definitions and reports current policy reward
   amounts, while `claim_mission` can settle older verified obligations using their original
   reward/config. Disabled/replaced vested definitions may be undiscoverable through the list;
   a dedicated vested-obligation projection with claim identity/amount/permission is needed to
   expose those safely. The frontend does not fabricate missing rows or rewards.

These observations require no WEDCAL edits in this frontend PR. There is no Growth milestone,
global/per-Epoch budget, Economic Policy/Admin/alert, pricing, trading or wallet UI. Existing
Clan Missions, Clan Shop prices, confirmed DLX and PostHog consent/privacy contracts are unchanged.
No merge, deployment or production operation is part of this work.
