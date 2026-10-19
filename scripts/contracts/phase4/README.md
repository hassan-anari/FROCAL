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
The existing Tap controller, leases, journal, pointer authority and reconciliation are unchanged;
its existing availability wrapper now shares the same earning gate as the UI.

The old full-page Season gate is removed: lack of an earning Season is not a reason to hide
historical records, confirmed balances or ordinary navigation. Authentication, backend feature
availability, and existing Tap recovery remain enforced.

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
