# B2 frontend — implementation and contract dependency register

Status: **IN PROGRESS — backend contract binding pending. Not a completed B2 release.**

The owner authorized continuing all independent frontend work while the B2 backend
agent develops its authoritative contract. Keep this delivery in one frontend Draft
PR. Do not merge, deploy, activate an invented protocol, or start B3.

## References and contract authority

- Frontend baseline: `hassan-anari/FROCAL@2e8666a115f04a9633945d267e3b11a1d4d89edd`
  (merged B1); branch: `ai/b2-frontend-instant-tap`.
- Backend main inspected: `hassan-anari/WEDCAL@95f8458e3058112e12053d090f54a10e0aedd599`.
- **Backend B2 PR / reviewed contract SHA: unavailable.** No B2 branch was present
  in connector searches and Git ref inspection during this implementation.
- Existing B1 fixture pin remains `cadc257fbed5c6bf36e31c767e70f4cd430e350d`, PR #26.
  This pin verifies B1 compatibility only. It is never used as a Tap v2 contract.
- Read the cross-repository integration contract (BT-01–07 and migration gates),
  backend AGENTS, relevant Season 1 points/config/Tap rules and hardening backlog,
  frontend working/product/status guidance, B1 reports, affected code and tests.
  Existing canonical backend docs still describe the old UTC daily cap; the backend
  B2 agent owns their reviewed reconciliation and new effective config.

## Implemented independently of wire schemas

### Physical input and animation continuity

`physicalPointers.ts` accepts one trusted, eligible pointerdown per active pointer.
Simultaneous non-primary fingers count separately. Pointer-up/cancel/lost capture
release ownership; visibility loss/blur resets the gate. Compatibility clicks,
touch handlers, synthetic pointerdowns/repeated clicks, held pointers, movement and
touch-emulated mouse input cannot produce additional rewarded events. Keyboard
clicks do not become economic touches. The existing button and accessible name stay.

`DexoStage` keeps the approved float/reveal/assets and accepts the current base-stage
asset separately from personality reactions. A progression asset change can pass
through while a reaction is active; it no longer waits for the reaction timer.
`BaseTapFeedback` creates effects before paint and removes completed timer references,
preserving the original particle appearance and 820/900ms animation/removal timings.

### Durable outbox and shared read model

`src/game/base/tapV2/` contains **internal normalized interfaces, not backend API
DTOs, routes or an alternate economy contract**. It is deliberately not connected
to production Tap. `TapPort` is the only future wire boundary. No endpoint was invented.

- Prior authorization comes only from a freshly validated server snapshot supplied
  by the future reviewed adapter. Persisted storage never grants allowance.
- A synchronous, validated, read-back-confirmed append precedes any instant display
  update. Every event records only verified player/Season/config/session/lease scope
  and its individual sequence, never raw initData or client reward totals.
- One journal per player, maximum 1,024 unresolved events and 256,000 serialized
  characters. Overflow, quota failure, malformed state, unexpected external writes
  and uncertain durability stop new credit while retaining recovery evidence.
- A player-wide Web Lock excludes another tab. Missing lock support fails closed.
  The future binding must supply the existing recovery UI for unsupported WebViews.
- Exact request keys and sequence arrays persist before transmission. Local retry
  metadata is excluded from submissions. One request is in flight. Transport delay
  adapts to observed RTT, accelerates at the authorized batch size, and never delays
  the local visual update.
- Requests have bounded deadlines; retry uses bounded exponential backoff, respects
  Retry-After, and stops after six automatic attempts. Explicit reconciliation can
  resume the same durable request. No new request key is minted for uncertain delivery.
- Committed snapshots and authorized-unsent display are separate. Acknowledgements
  remove only their exact lease/sequence scopes. Stale responses cannot overwrite a
  newer balance. Partial acknowledgement of an immutable request pauses for recovery.
- Server-grant allowances cannot be increased by local cooldown expiry, browser
  refresh, UTC midnight or mutable storage. Timing uses a server anchor and monotonic
  elapsed time. Fast device clock changes can stop authorization early, never extend
  it. Background/resume requires fresh synchronization.
- Different-account responses are rejected; closing a controller fences late results.
  Old config/Season/session/lease obligations are retained, never repriced under a
  new grant. Terminal rejection removes unconfirmed display credit and durably blocks
  automatic replay, including after restart. This exceptional recovery differs from
  successful authorized settlement, which does not reduce displayed XP.
- Level, progress and stage are calculated from the supplied validated policy; there
  is no embedded B2 level curve, reward value, daily cap, burst allowance or cooldown.
  A level-change event is published synchronously for the existing reveal component.
- `useTapView` shares a single React read model. `cacheBridge` updates existing
  current-session Bootstrap/Profile caches only after committed snapshots, cancels
  older in-flight reads and ignores stale/foreign scope updates without per-touch
  Bootstrap requests or refetch storms.

**Adapter review requirements:** the internal comparable revision/cursor guarantees,
lease expiry/redemption rules, complete-vs-partial receipt semantics and error mapping
must be checked against the actual B2 contract and revised if necessary. The backend
contract wins. The journal is a delivery mechanism, not an economic ledger.

### Legacy queue audit and recovery preparation

The deployed v1 path still uses `baseTapLocalState.ts`, `useBaseTapExperience.ts`,
`useBaseTapBatcher.ts` and `baseTap.ts`; it is not prematurely removed or activated
alongside v2. Current consumers are Base, GameHeader and B1 progression/profile hooks.

`inspectLegacyQueues` inventories queues under Bootstrap-verified canonical and legacy
identity aliases, preserves original pending request keys/counts and unassigned buffers,
and leaves malformed/oversized evidence untouched. Old daily points/floors never enter
the new read model. No old event is silently converted to a new lease, repriced, deleted
or recredited. The internal fixture's authoritative 150 starting points remain exactly
150 before touches, even when unrelated legacy floor data exists.

Actual migration/drain awaits backend v1/v2 compatibility, dedupe retention and durable
obligation-resolution rules. In particular, an old keyed request might already have
committed after a lost response, while an unkeyed buffer has no equivalent receipt.
Neither can safely be blindly replayed as a fresh v2 event.

### Production Diagnostics/mock exclusion

- Vite rejects local/msw/unknown data sources and enabled Dev/Arena debug flags for
  every build mode. Non-production NODE_ENV cannot be used to ship a developer bundle.
  Values loaded from env files are validated as well as process variables.
- Release data selection is compile-time remote. Public URL/runtime flags cannot
  enable mocks or Arena debug. Diagnostic scenario/XP/Clan/Arena mutators are inert.
- The Season button retains identical markup, classes and accessible label, with no
  production click handler. Triple taps cannot set a return path or navigate.
- `/diagnostics` redirects to the existing entry route, preserving signed launch
  parameters; its component is absent from the production dependency graph.
- Diagnostics, DevScenarioPanel and mock browser/Bootstrap fixtures use development
  conditional imports. A build source-map audit proves those modules and the B2
  browser harness/fixtures are absent from release bundles.
- Local Diagnostics and fixtures remain available. Playwright runs a Vite development
  fixture server and a separate real remote production bundle. The fixture server has
  no proxy to the shared API. B1 API tests fully intercept GET requests.

### Avatar preparation and limits

`VerifiedAvatar` describes an internal verified owner/version and either a safe URL,
an authenticated in-memory Blob loader, or an unavailable cache. A supplied cache
descriptor always outranks external Telegram metadata. Unsafe protocols, URL credentials,
wrong-account descriptors, invalid image MIME types and oversized authenticated images
fall back to initials. Failures are remembered in a bounded memory-only set to suppress
repeat failed loads. Authenticated object URLs are revoked on identity/image changes.

Existing ProfileAvatar and Header slots use the safe loader/failure fallback without
changing their shape, dimensions, frame, crop or CSS. B2 cached metadata is not bound
to Bootstrap or an invented endpoint. The browser test uses a locally intercepted
cache image with the Telegram photo host blocked and verifies image decode/crop and
zero requests to that blocked host. **This proves the abstraction/component, not an
operational backend image cache or real VPN-off Telegram delivery.**

## Validation and evidence

Preserve all 83 B1 unit tests and 72 browser scenarios. Added tests cover internal
authorization/display/progression, 49/50/51 boundaries, repeated bursts and midnight,
refresh, lost/duplicate/stale responses, retry/rate limits, lease expiry/device time,
scope rollover, storage failure/tampering/bounds, session ownership, terminal rejection,
legacy preservation, cache isolation, production flags/routes and avatar fallback.

Commands:

```sh
npm run check
npm run validate:telegram-sdk
work/contract-venv/bin/python scripts/contracts/generate_bootstrap_fixture.py --check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --workers=2
git diff --check
```

Results and exact-head CI links are recorded in the Draft PR. Tests use synthetic
credentials and isolated fixtures only. No live authenticated/reward calls, player
creation, production load, backend mutations, merge or manual deployment occurred.
The existing bundle-size warning remains; no test timeout/assertion was weakened.
An environment restart interrupted one validation run; only completed reruns count.

Local completed evidence: **121 Vitest tests / 24 files**, **12 production-policy
checks**, full TypeScript/build/module-exclusion validation, SDK pin and B1 fixture
checks passed. **88 full Playwright scenarios** passed; the final input/animation
changes also passed all **8 affected mobile/desktop scenarios** again. Hosted CI
must verify the entire final commit independently; its links/status belong in the PR.

## UI/UX Preservation Report

Zero CSS, layout, typography, font, color, spacing, asset, safe-area, scrolling,
fullscreen, navigation or modal-design changes. No screenshot baseline updates.
Existing float/reveal/particle timings, reaction art and haptics remain. Functional
changes are pointer eligibility, immediate progression-asset propagation, production
debug removal and existing avatar initials after an image failure. The Season badge
looks and announces exactly as before. No unavoidable redesign is proposed.

## Exact remaining B2 dependencies and next work in this same PR

1. Backend B2 agent publishes a stable branch/Draft PR and committed DTOs/config,
   errors, avatar delivery metadata and legacy drain/dedupe rules. Fetch the exact
   SHA through the GitHub connector, review it and pin source/fixture provenance.
2. Implement Zod **wire** validation and the `TapPort` adapter from those actual DTOs;
   confirm internal revision/cursor, cooldown, redemption, fencing and rollover rules.
3. Bind the controller to authenticated Bootstrap/account lifetimes. Replace the v1
   runtime/accounting consumers in Base/Header/Profile/level/stage/summary views;
   connect the existing level-up reveal and cooldown presentation to authorized state.
   Finish the safe legacy drain without duplicate credit or lost obligations.
4. Bind authoritative cached-avatar metadata or authenticated delivery. Validate the
   real backend storage setup separately from frontend fallback support.
5. Extend the pinned schema harness to B2 and run exact paired isolated/staging
   integration, all validation, browser tests and Actions on the final paired SHA.
   Only a controlled backend-compatible rollout may activate v2 after independent
   review and explicit owner approval. No shared-deployment reward tests without
   permission. No merge/deploy/B3 is authorized by this report.

Until those contract-dependent steps are finished, B2 remains IN PROGRESS and this
Draft must not be described as a completed Tap v2 integration or release candidate.
