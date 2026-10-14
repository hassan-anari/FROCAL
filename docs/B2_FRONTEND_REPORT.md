# B2 frontend — actual integration and review evidence

One coordinated implementation in [FROCAL Draft PR #3](https://github.com/hassan-anari/FROCAL/pull/3), branch `ai/b2-frontend-instant-tap`. Independent review and explicit owner approval remain required before merge or deployment. No B3 work.

## Contract authority and endpoint mapping

Backend: [WEDCAL Draft PR #27](https://github.com/hassan-anari/WEDCAL/pull/27), pinned **`34328c76ba3377396660b1549bf8e370ac514a71`**, including the compatibility follow-up. Reviewed the actual contract, follow-up, handoff, schemas, OpenAPI, fixtures and relevant backend implementation. This supersedes initial B2 `47205df`; B1's separate fixture pin remains solely a B1 compatibility gate.

`scripts/contracts/b2-pin.json` records the exact commit and Git blob IDs of the unchanged backend fixture, OpenAPI and schema copies. `npm run validate:contracts` rejects drift. The paired harness verifies checkout HEAD and byte equality, then validates the fixtures using the actual Django/Pydantic classes.

| Authenticated route | Exact mapping |
| --- | --- |
| `GET /api/v1/base/v2/tap-state?session_id=<UUID>` | Verified player, current Season/config, server time, `(receipt_cursor, revision)`, earning/issuance flags, `burst_remaining`, absolute cooldown, matching-session lease, authoritative progression and Season Points |
| `POST /api/v1/base/v2/tap-leases` | `{session_id, takeover:false, expected_generation:null}`; real durable session UUID; no automatic device takeover |
| `POST /api/v1/base/v2/tap-batches` | Persisted lease/session UUIDs, generation, first contiguous sequence, tap count and unchanged idempotency key; no client reward total |
| Existing `POST /api/v1/base/taps` | **Receipt-only legacy recovery**, never physical gameplay. Exact original key/count, only after a verified v2 cutover snapshot; only `created:false` receipts are accepted |
| Bootstrap/Profile `photo_url` | Prefer the actual server-selected cached `https://<configured-origin>/api/v1/profile/avatar/<delivery-UUID>` URL. No invented avatar endpoint or metadata field |

`tapV2Contract.ts` validates the actual wire contract with Zod. `tapV2.ts` is the only economic adapter. Every successful batch's nested immutable receipt must match the persisted request's key, lease, session, generation, starting sequence, requested count, Season and pinned config. Flat response fields must equal the receipt; accepted/rejected counts and sequence prefix must balance. Receipts may belong to a previous lease/Season while the response snapshot belongs to the current one.

Ordering is lexicographic **`(receipt_cursor, revision)`**, never revision alone. Daily/Mission/other ledger sources can advance the cursor without changing Tap revision. Request retirement uses exact receipt evidence independently of snapshot freshness. There are no invented acknowledgement arrays, inferred cursor acknowledgements, demo economic fallback or client-supplied authoritative totals.

## Active gameplay and instant response

`TapSessionProvider` owns one authenticated controller above the game screens. Base, Header, Profile and shared progression hooks subscribe to its read model. `useBaseTapExperience` and `useBaseTapBatcher` are compatibility wrappers around that controller. `baseTapLocalState.ts` contains legacy key names only. Old daily counters, UTC resets, daily caps and lifetime floors no longer calculate remote XP.

A trusted physical pointerdown synchronously appends and verifies one durable sequence before updating the existing effects, Lifetime/Season Points, level progress, level-up reveal and Dexo stage. HTTP runs later in adaptive microbatches. The read model explicitly separates `committed` from `authorizedUnsent`; pending delivery is never represented internally as a database commit.

The pointer gate accepts simultaneous non-primary fingers individually, tracks live pointer IDs, and releases on up/cancel/lost capture. Hold, movement, compatibility touch/click overlap, synthetic repeated clicks and emulated mouse input cannot create extra events. The approved button, haptics, reaction/particle timing and float animation remain in place. Dexo evolution assets, sizing and titles select the authorized stage while personality reactions continue.

All economics come from the current server snapshot and immutable lease policy. The initial backend policy supplies **50 touches, 1 XP each, 10-second cooldown**. Touch 50 immediately starts the existing cooldown presentation; touch 51 earns/displays no additional XP. A device timer, refresh, UTC day change or mutable storage cannot replenish allowance. The next lease requires server authorization. Config publication preserves the old lease's reward/cooldown; the next burst adopts the new policy. There is no daily Tap cap.

## Durable delivery, recovery and isolation

- One bounded journal per verified player: at most 1,024 unresolved events/batches and 256,000 serialized characters. Each sequence carries player, Season, config, session, lease and generation. Persisted lease metadata describes delivery grouping only, never reward prices, balances, authorization or raw Telegram initData.
- Exclusive player Web Lock for the controller lifetime. Unsupported locks, quota/read-back failures, malformed/tampered journals and unexpected external writes stop new XP. The approved connection/retry screen is reused for recovery; no new UI is introduced.
- Stable session/request UUIDs and exact request bodies persist before transmission. One in-flight microbatch; RTT-adaptive grouping, server batch limit/minimum interval, request deadline, bounded exponential retry and Retry-After handling. Six automatic submission attempts; uncertain bodies retain their original key.
- Refresh/resume creates stable batches for unassigned durable sequences, replays exact old requests before fresh authorization and reconciles a fresh server snapshot. No request is erased merely because a sequence or ledger cursor advanced.
- Valid delayed receipts retire matching requests even when their snapshots are stale. Partial receipts retire the whole original request, retain rejected-tail evidence and never remint that tail. Rejected uncommitted requests require an exact replay producing a definitive terminal code. An idempotency conflict is durably blocked with its evidence retained.
- Lease expiry, revocation, restriction, Season/epoch finalization and changed devices cannot create replacement credit. Same-body committed receipts remain recoverable after expiry/rollover. No automatic takeover. Authentication renewal requires fresh Telegram credentials.
- Background/resume requires reconciliation. Expiry/cooldown use server time anchored to monotonic elapsed time; a fast device clock can stop earning early but never extend authorization. Periodic recovery cannot abort a live request or bypass backoff.
- Credential, player, Season and config turnover closes the old controller, aborts work, removes old scoped caches and fences late responses. Durable journals remain separate per verified identity.

## Legacy transition and release storage

The backend operational sequence remains mandatory: pause v1 ingress, drain/reconcile old accumulators into RewardLedger, publish the controlled protocol-2 config at its required UTC boundary, then enable v2 issuance. This PR executes none of those deployed operations.

`recoverLegacyQueues` inventories only Bootstrap-verified identities. It preserves original queues byte-for-byte, including valid keys/counts, unkeyed buffers, malformed/oversized values and old counter evidence. After `issuance_enabled` verifies the compatible cutover, exact keyed v1 requests retrieve existing receipts. Separate bounded-size recovery markers prevent unnecessary repeated lookups; they never grant XP.

Proven isolated result: a real server-owned 150-XP player with a real accepted seven-tap v1 receipt is drained to **157**, then recovered repeatedly without duplicate credit. Ordinary 150-XP players start at exactly **150** before new touches, regardless of stale demo/cache counters.

Unrecoverable cases are explicit: unkeyed buffers, missing/expired legacy receipt metadata, invalid/oversized old queues and changed-body key conflicts. Their raw evidence is retained. They are never converted to v2 rewards. Owner/backend reconciliation is required if valid historical obligations cannot be proven by retained server evidence; browser counters cannot establish them.

`storageRelease.ts` uses an intentional storage compatibility release (`b2-1`), not every Git SHA. Before store hydration it removes only known reconstructible demo/cache keys. Device-local per-player onboarding, preferences, all Tap journals, legacy queues and unknown evidence remain intact. Server query caches are memory-only; each app load reads fresh authenticated Bootstrap. Existing immutable versioned asset/SDK caching is unchanged. No server-side onboarding persistence was added.

## Shared progression and avatars

Instant progression is shared through one React subscription; successful receipts update only existing Bootstrap/Profile caches matching authenticated session, player, Season and config. Older in-flight reads are cancelled, stale tuples ignored, and no cache is created for a departed account. No per-touch Bootstrap request. Independent Daily/Mission Bootstrap changes trigger a coherent v2 read rather than injecting a cursor-less balance. Config/Season changes refresh Bootstrap once and recreate the scoped controller.

Header/Profile/Arena use the actual Bootstrap/Profile photo URL and safe image abstraction. Server cache URLs take priority; unsafe protocols/credential-bearing URLs are rejected. Failure falls back to existing initials with bounded memory-only failure suppression. Account/image changes produce distinct delivery keys. Loading an image never blocks Bootstrap or app navigation.

The paired test uses actual backend avatar metadata and actual delivery bytes with an isolated private-storage implementation, blocks the external Telegram host and verifies image decode. Unavailable private storage returns the real backend failure and the browser uses initials without repeated external requests. **Operational VPN-off delivery remains unproven** until private S3/cache workers/public origin are configured and the owner tests the deployed Mini App without VPN.

## Production debug exclusion

The Season badge retains its markup, CSS, layout and accessible label. Its three-tap handler is absent in production. Direct `/diagnostics` is blocked; Diagnostics, scenario panel and mock fixtures are compile-time development imports. Public runtime configuration cannot enable debug mutation controls. Every Vite build rejects local/msw/unknown data sources, enabled Dev/Arena debug flags and non-production build NODE_ENV, including values loaded from env files. Explicit local development/CI fixture support remains available.

Evidence: build-policy tests, production source-map module exclusion and the unchanged production-mode B1 browser tests for badge triple taps, direct routes and debug flags.

## Validation and reproduction

The PR's final commit checks record full validation and hosted CI links. Suites preserve B1 and add wire validation/provenance, immediate input/progression, multi-touch, 49/50/51, cooldown/clock/refresh/midnight, storage bounds/failures, lost/duplicate/stale responses, partial prefixes, fencing, auth/account/config/Season rollover, other ledger sources, old-client cutover, cache isolation and cached-avatar failure coverage.

```sh
npm run check
npm run validate:telegram-sdk
python scripts/contracts/generate_bootstrap_fixture.py --check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

For actual paired tests, check out WEDCAL at the exact pin under `work/backend`, run its `uv sync --frozen --python 3.13`, and provision a **fresh isolated PostgreSQL 17 database**. Then:

```sh
POSTGRES_DB=frocal_b2_test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5432 \
POSTGRES_USER=b2_test POSTGRES_PASSWORD=isolated-test-only npm run test:paired
```

The harness refuses a non-local/non-test database and a backend SHA/source mismatch. It runs actual Django authentication, API services, PostgreSQL migrations, RewardLedger and avatar delivery, with synthetic users, a virtual server clock and isolated private image storage. Browser traffic stays local; no public reward calls or live load tests. The test-only controls/server are excluded from production. Paired browser tracing, screenshots and video are disabled; only sanitized results JSON is uploaded. Separate artifact directories avoid interference with the B1 browser suite.

Hosted `Frontend validation` includes unit/build, the complete B1/development browser matrix, and a pinned paired B2 PostgreSQL/browser job. Backend PR #27 documents its separate green backend workflows. Existing bundle-size/Zod annotation warnings remain; no tests were disabled, assertions weakened or arbitrary timeouts increased.

Completed local evidence: **138 Vitest tests in 26 files**, **12 build-policy tests**, TypeScript/production build/module exclusion, asset/import/motion/structure/SDK checks and B1/B2 fixture pins. Actual paired PostgreSQL integration: **14 passed**; production game/browser integration: **6 passed**, including device/account isolation and recovery after quota failure. The full **88-scenario** B1/development browser matrix and final-head hosted results are recorded in PR #3's checks and delivery evidence.

## UI/UX Preservation Report

**No approved CSS, fonts, colors, spacing, layouts, artwork, asset files, navigation, safe areas, fullscreen or scrolling behavior changed.** No screenshot baselines were rewritten. Season badge appearance/accessibility, Dexo personality reactions, float/reveal/particle timing and haptics remain. Functional changes select authorized progression/assets, use the existing level-up/cooldown/recovery presentation and show existing initials after image failure. No unavoidable redesign or new screen is proposed.

## Rollout, rollback and remaining operational dependencies

1. Independently review both unmerged Draft PRs at their pinned heads. Approve merge/deploy separately. The B2 frontend branch's automatic Vercel deployment remains disabled; launch domain/Telegram behavior are unchanged.
2. Backend must deploy the compatible routes/receipt amendment first, apply its reviewed prerequisites and complete the controlled legacy pause/drain/config cutover. A backend without v2 returns static authenticated server balances and no newly authorized Tap XP; there is no demo/v1 earning fallback.
3. Enable issuance only after backend readiness, config/Season policy and ledger reconciliation pass owner review. Onboarding stays device-local. Browser Web Locks and durable storage are required for instant earning; unavailable clients fail closed through existing recovery.
4. Roll back by disabling **new lease issuance**, while keeping v2 receipt redemption and legacy receipt lookup available. Do not restore v1 earning or delete outboxes while v2/legacy obligations remain unresolved. Do not roll back to a server that cannot redeem committed requests.
5. Configure private avatar bucket/credentials/lifecycle, controlled API origin and cache workers/shared Bot API budgets, then perform an owner-approved VPN-off device test. Isolated frontend/cache support is complete; public storage/network operation is a deployment dependency.

No merge, deployment, shared-data migration, deployed player mutation, public load test or B3 action is part of this delivery.
