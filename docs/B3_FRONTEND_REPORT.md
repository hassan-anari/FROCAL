# B3 frontend implementation and review evidence

Delivery: [FROCAL Draft PR #4](https://github.com/hassan-anari/FROCAL/pull/4), branch `ai/b3-frontend-integration`, targeting `main`. The PR records the final frontend SHA and exact-head CI jobs/results. No merge, deployment, public reward calls or live data reset is authorized or performed.

Backend: [WEDCAL Draft PR #28](https://github.com/hassan-anari/WEDCAL/pull/28), pinned **c3f8f27d18fda66b62e22c6cadd1480e1f0f4370**. Exact source and fixture Git blobs are checked by `scripts/contracts/check-b2-contract.mjs` and before paired execution. Pinned [contract](../scripts/contracts/b3/B3_BACKEND_CONTRACT.md), [handoff](../scripts/contracts/b3/B3_BACKEND_HANDOFF.md), [OpenAPI](../src/integrations/api/fixtures/b3/openapi.json). B2 remains independently pinned at `34328c76ba3377396660b1549bf8e370ac514a71`.

The final backend pin synchronization updates the CI checkout and exact contract/handoff blobs for optional isolated banner storage credentials. OpenAPI, all versioned fixtures and Tap schemas are byte-identical to the prior pin; no frontend API or UI changes are required. Current-pin paired results and exact-head CI evidence are recorded in the PR.

## Route and endpoint integration matrix

All economic/user reads and writes use existing signed Telegram authentication and B2 account/Season/config query scoping. Raw credentials never enter query keys, telemetry, reports or economic local storage.

| Screen / consumer | Endpoint | Behavior |
|---|---|---|
| Bootstrap, Header, all progression consumers | GET `/api/v1/bootstrap` | Identity, feature/earning flags, config, complete canonical progression and summaries |
| Base Tap | GET `/base/v2/tap-state`, POST `/base/v2/tap-leases`, POST `/base/v2/tap-batches`, POST `/base/v2/tap-release` | Existing authenticated v2 economy; exact journals/receipts, bounded ownership reads, explicit switch and acknowledged-only release |
| Shared rewards | GET `/rewards/state` | Complete server-owned projection and receipt cursor; independent reward refresh |
| Base banner | GET `/content/banners/BASE`, GET approved immutable `/content/banner-assets/{uuid}/{digest}.webp` | Server eligibility/scheduling; validated content, safe links, no public placeholder/local override |
| Base summary, Earn Daily | GET `/daily`, POST `/daily/claim` | Actual UTC period/reset, reward cycle, claim status and streak; duplicate-safe settlement |
| Base objective, Earn mission list | GET `/missions`, POST `/missions/{key}/start`, `/verify`, `/claim` | Published definitions, genuine verification token/state, unavailable/ready/claimed states, confirmed rewards |
| Profile mission evidence | POST `/profile/review` | Records actual Profile visit; mission verifier remains server-owned |
| Earn Typing summary and challenge | GET `/typing`, POST `/typing/attempts/start`, `/typing/attempts/{uuid}/submit`, `/typing/claim` | Issued/resumable phrase, server timing/scoring/quota/wallet, durable claim/start keys and exact submission retry |
| Earn Referral | GET `/referrals`, `/referrals/invitees?offset=0&limit=30` | Canonical code/link, eligibility, actual tiers/shares, pending/verified counts and latest five real invitees |
| Earn Creator / Network | GET `/network`, `/network/groups?offset=0&limit=30`, POST `/network/groups/intents`, `/network/groups/{uuid}/reverify`, `/network/groups/{uuid}/broadcast-consent` | Registration CTA, actual verification/admin states, qualified-speaker/activity metrics, settled earnings and owned-group broadcast consent; no invented member counts or Creator wallet |
| Profile / Base identity | GET `/profile/overview`, approved cached avatar delivery | Actual journey facts, identity and canonical progression; failed photos use shared fallback |
| Existing notifications / Arena balance | Existing `/notifications` and DLX balance reads | Retained separately; B3 does not merge DLX with XP/Season Points |

Paths after the first row use the same `/api/v1` prefix. Connected Communities exposes each owned group's actual broadcast opt-in and the existing authenticated consent API. Private bot Admin, welcome messages and broadcast execution remain backend responsibilities; no duplicate Mini App Admin was introduced.

## Real versus previously mocked data

Production Daily no longer uses the local 40-XP constant or client calendar to authorize a reward. Missions no longer mark themselves complete or credit local XP. Typing's local WPM/accuracy animation is presentation only; the server result and confirmed wallet settlement determine rewards. Server-configured limits replace the displayed permanent five-attempt assumption.

Referral code/link construction from Telegram ID, demo invitees/groups, fixed tier thresholds/percentages, local share counts and fabricated Creator earnings are excluded from authenticated views. Qualified speakers are labelled as speakers, never Telegram members. The local scenario store remains only for explicitly selected development scenarios and existing visual regression fixtures.

The contract supplies no per-run Typing history, generic reward history or Network event feed. Production renders an accurate unavailable state (History button disabled) rather than fabricating events. Confirmed aggregate totals remain live. PH-043 Season brief remains explicitly unavailable; there is no fake completion verifier.

## Session recovery and behavioral proof

The approved error-screen background, composition, typography and button styles remain. Player text distinguishes another device, a moved session, a local tab, actual storage failure, network loss and expired Telegram launch credentials. Raw codes and implementation details are absent. A real Retry coalesces repeated submissions, visibly waits and executes reconciliation. Storage/corruption failures preserve evidence.

`Switch to This Device` appears only with the finalized ownership capability and requires a separate confirmation. It uses the observed generation. A race requires another deliberate choice; retries and online/visibility events never automatically take over. An idle visible owner reads ownership about every five seconds, without a heartbeat or touch-produced request stream. Hidden clients stop maintenance. Page hide releases only the current exact acknowledged lease; pending input prevents release. Lost release can recover through deliberate switching before 120 seconds.

Paired tests cover separate Mobile/Desktop identities, repeated Retry, stale generations, cooldown, expiration, a fenced client after lease-retention cleanup, same-device multiple tabs, both clients closing, lost switch/receipt responses, and immutable unconfirmed journals/onboarding. Assertions bound healthy isolated switch to 15 seconds and reopen to 20 seconds. Runtime measurements are uploaded as `session-measurements.json` and `session-browser-measurements.json`. Prior-pin (`88b26be`) local [API measurements](evidence/b3/session-api-final.json) and [browser measurements](evidence/b3/session-browser-final.json) are committed as historical evidence: deliberate switch 505 ms, idle visible moved-session detection 2429 ms, acknowledged reopen 1068 ms. The PR records current-pin exact-head CI artifacts; the committed measurements retain their original backend SHA.

These are Chromium device contexts and local PostgreSQL measurements. They do not certify physical Telegram Android/iOS/Desktop, WAN performance, offline revocation visibility or delivery of pagehide. Passive lease expiry remains 120 seconds; explicit switching is the fast recovery path. No timing guarantee is claimed to players.

## Progression ordering and durability

`canonical.ts` adopts complete validated player/Season/config projections in receipt-cursor order. The existing Tap cache bridge publishes its confirmed projection into the same shared cache and rejects lower-cursor snapshots. Background Bootstrap/Profile reads retain a newer already-confirmed projection, while refreshing other actual summary fields. Independent claims invalidate scoped Earn, Profile and Bootstrap queries; a queued Tap reconciliation waits for in-flight receipt processing. No client addition, XP floor, forged Tap revision, journal deletion, navigation or page reload settles a reward. Lifetime XP and Season Points retain distinct values; unrelated DLX data is untouched.

Storage extends `storageRelease.ts` to deliberate compatibility `b3-1`, removing only the named reconstructible B1/B2 demo keys. It preserves per-player onboarding, all scoped pending Tap journals, unresolved legacy evidence, safe preferences and unknown keys. Completed pre-account B1 onboarding is adopted once for the first verified player; a retained owner marker prevents it being inherited by a second Telegram account. Existing B2 account preferences remain authoritative. A denied Storage getter cannot crash startup. Optional session preferences fail softly. Typing request keys and pending exact submissions are player/Season scoped and preserved across uncertain delivery.

HTML revalidates; hashed static assets retain immutable caching. `client-release.json` is fetched with no-store on entry, visibility and a bounded interval. A truly different compatibility marker offers a manual refresh using the existing modal. In-flight/unacknowledged Tap or unresolved old evidence, including another account's outbox, blocks refresh. Build hashes do not clear storage or force reload.

## Visual preservation

Changes to artwork, layout, spacing, dock geometry, navigation behavior, cropping, frames, avatar sizes/fonts, tap particles/haptics or animation timing were not introduced. Existing JSX/classes and overlays are reused for real data and narrowly required status/disabled/claim states.

- Shared fallback uses approved `cyan-soft`/`cyan` and dark existing text tokens. Photos are unchanged; no extra remote request is made to obtain a fallback. Contrast is approximately 11.79:1–14.29:1. [Profile mobile](evidence/b3/avatar-profile-mobile.png), [Base/Header mobile](evidence/b3/avatar-base-mobile.png), [expired cached avatar desktop](evidence/b3/avatar-expired-cache-desktop.png). The browser suite also captures fresh focused snapshots.
- Season 1 Critical Action rendering was removed, with persisted-state rejection in the existing store. Fresh, B2 upgrade and persisted-true cases are tested. Future CSS/artwork and unrelated Clan features remain.
- Launch Diagnostics was removed from recovery screens. DEV diagnostics remain isolated behind compile-time DEV checks. The production bundle/module scan and browser error-screen/direct-route tests assert exclusion.
- The Base promotional slot remains below Header and above the Dexo card, at 1200×260 / 60:13. An unready, invalid, absent or failed image occupies no layout. Server revalidation removes disabled/expired content; the backend contract does not expose schedule timestamps, so removal follows the next effective-content read (10-second interval/focus), not an invented client deadline.
- The sole dock CSS change removes `.active .navGlyph::after` entirely. Active colors, labels, small station node, positions, dimensions and interactions remain; all five items are checked in production browser tests.

## Validation and evidence

`npm run check` runs structural/asset/import/motion policies, fail-closed production policy, pinned contract blob checks, TypeScript, units, the actual production build and diagnostic/Season-2 bundle exclusion. The expanded unit suite includes all published Earn/Network/banners schemas, unsafe destinations, unavailable missions, coalesced claims, lost Typing claim keys, Telegram verification recovery and ordered cross-currency/cache isolation.

`npm run test:e2e` retains the original mobile/Desktop visual/interaction suites and adds production storage upgrades, diagnostics exclusion, avatars, banner absent/disabled/future/active/expired/failure/image/URL/version cases and all-five-icon glow checks. Test-only banners and identities are synthetic and never enter public fallback content.

`npm run test:paired` independently runs B2's 15 actual PostgreSQL API/controller regressions and 6 production browser scenarios. `npm run test:paired:b3` checks the exact pinned backend source bytes, migrates an isolated PostgreSQL 17 database, then runs original Tap regressions plus B3 recovery/Earn/Network/banner tests and production browser flows. Telegram/storage transports are controlled locally; all reward logic, HMAC verification, PostgreSQL locks, projections, idempotency and receipts run in WEDCAL. Database names and localhost are required by the harness. No public deployed reward tests are used.

Successful local pairing at the final backend pin: **29 API/controller + 15 production browser tests**. This includes durable fencing after retention cleanup, actual CMS scheduling/immutable bytes, expired/ineligible Typing, actual Creator admin verification transitions and owned-group broadcast consent. The production build/exclusion and full 212-unit suite passed, including nullable-contract compatibility, safe URL handling and legacy onboarding ownership. Focused production mobile/Desktop browser tests also prove the B1 onboarding upgrade preserves original Tap evidence. All existing mobile/Desktop scenarios and focused navigation checks were exercised locally. The complete 134-scenario browser matrix and all four exact-head CI job URLs are recorded in the PR. CI artifacts contain machine-readable results, session timings and focused visual snapshots.

### Final review follow-up: owned-group broadcast consent

Connected Communities reuses its existing row styles, action styles and confirmation overlay. Each real owned group shows `broadcast_opted_in`; enabling requires an explicit confirmation naming the group. Revoke sends `{enabled: false}` directly. Both operations use the existing signed API and a shared submission lock. No CSS or navigation changes accompany this follow-up, and the backend contract pin is unchanged.

Consent is never written optimistically. After the POST, a required GET refresh supplies the displayed status; success is shown only when that fresh group agrees. Failed refresh shows unavailable status and no success. Mutation failures also reconcile group state, including uncertain delivery. Permission/verification and removed-group errors use plain text, with no raw backend details. The backend rechecks ownership and Telegram permissions; the consenting creator can revoke even when Telegram verification is temporarily unavailable.

Focused regressions: **6 hook/API integration tests**, **4 isolated PostgreSQL API tests** and **3 production browser scenarios**. These cover exact authenticated boolean payloads, repeated submissions, cancel without a POST, held POST/read responses without optimistic consent, failed reads, changed server state, foreign ownership, strict boolean validation, denied/transient verification with deliberate retry, and real revoke during a Telegram outage. Consent operations leave confirmed XP unchanged. Telegram transport alone is controlled in the isolated harness; backend permission checks, subscription state and audit logic run unchanged at the pinned SHA.

## Operational dependencies and independent review

Before any separately authorized rollout: review WEDCAL #28, all four additive migrations (including durable Tap session markers), API/workers, configured mission definitions/phrases, Telegram membership permissions/bot identity, genuine Creator workers, dedicated banner storage/HTTPS origin/trusted destinations and approved content. Banners and backend bot rollout switches remain disabled by default. No frontend setting overrides server availability.

Owner/independent review must inspect exact-head CI, the pinned backend contract and physical Telegram device behavior. PH-043 and existing branch-protection/rollout decisions remain owner gates. No merge, deploy, activation, public test mutation, backend schema rollback or next-batch work is included.
