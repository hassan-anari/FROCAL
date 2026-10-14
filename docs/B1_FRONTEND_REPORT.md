> Final paired-contract correction: [B1_FRONTEND_CONTRACT_CORRECTIONS.md](B1_FRONTEND_CONTRACT_CORRECTIONS.md)
> pins backend PR #26 and supersedes the original additive-field/error/eligibility handoff below.

# B1 Frontend — Foundation & Telegram Authentication

Batch: B1 / workstreams P-01, P-04 and frontend QA baseline.
Repository: `hassan-anari/Dalexio-Game`; branch: `ai/b1-frontend-foundation`; target: `main`.
Frontend base: `6e9f3c7136f92fef4167ed2b490b847dff7e2bb7`.
Backend reference: `hassan-anari/WEDCAL` at `f52a6555f0ba4b140df8d14ae578470bc533bb3a`.
Contract: [merged backend PR #25](https://github.com/hassan-anari/WEDCAL/pull/25),
`DEXO_LAND_CROSS_REPO_INTEGRATION_CONTRACT.md` v1.1 (original PR #22).
Backend AGENTS, Season 1 Source of Truth, Economy Contract, hardening backlog,
`apps/telegram/{auth,mini_app_auth,api}.py`, `apps/rewards/api.py` and
`dexo_land/api.py` were inspected. Frontend README and working instructions apply;
this batch's newer scope supersedes their historical next-module instructions.

## Root cause and implementation

The previous synchronous external `telegram.org` script and one-time adapter snapshot
created a credible VPN-off failure path: SDK failure meant no WebApp object, which was
classified as a browser. A later SDK/native initialization could not change the adapter.
This is a reproduced code/fixture failure, **not proof of the sole cause on actual devices**.
App origin/CDN/API filtering can still fail independently of SDK delivery.

- Serve the official unmodified bridge from the app origin; content-pin, SRI and hash
  validation are recorded in `public/vendor/telegram/README.md`. No external SDK request
  is needed at runtime. Upstream's URL is mutable, so the pin is a byte snapshot, not
  an invented upstream release version.
- Read official `tgWebAppData`, Platform, Version and StartParam launch fields. Raw data
  is decoded once and forwarded unchanged. Official same-tab `__telegram__initParams`
  recovery covers refresh and client navigation, including when the SDK is absent.
  New launch parameters replace prior cached parameters; malformed/blocked storage
  does not manufacture credentials. Query-string variants are also supported.
- Launch hints/native bridge presence affect UX only. Unsigned user data does not
  authenticate any request. Backend HMAC, expiry, bot/user and duplicate-field checks
  remain intact. All authenticated identity comes from validated API responses.
- Startup polling is bounded (100ms for 6s, initial missing-data state after 1.5s).
  Focus, pageshow, visibility, hash changes and explicit Retry recover later injection.
  Retry can reload the same locally pinned SDK with its SRI after an asset failure.
- Preserve mobile fullscreen, native desktop presentation, safe areas, chrome colors,
  viewport subscriptions and haptics; unsupported native methods are safely tolerated.
- A single Bootstrap provider handles every route, including cold Onboarding, Profile,
  Base and Diagnostics. Independent route calls that omitted initData are removed.
- Protected API calls resolve raw initData when an explicit value is not supplied,
  override caller Authorization with `tma` credentials, and fail before fetch when
  credentials are missing. Timeout bounds include response-body delivery. Cancellation
  propagates; only transient read failures receive at most two automatic retries.
- Bootstrap normalization retains typed daily/typing/missions/referral/network and
  config payloads. Initial Level, Lifetime XP, level progress, Dexo stage and Season
  use server data. Profile identity/photo and journey counts use validated Profile data
  where available. Shared level/progression selectors cover Earn, Clan and Arena too.
- Query keys contain an opaque credential-session generation, validated player,
  Season and config version. Raw credentials never enter query keys. Account changes
  cancel/remove prior queries; Season/config turnover clears dependent data and remounts
  route state. Bootstrap refreshes on resume and every 60s while active. Onboarding
  completion is scoped to validated player and restored on refresh.
- Production failures never select local fixtures. Local/MSW remain explicit development
  choices; development defaults to local, production defaults to remote. All initial
  screens share native loading/error/recovery states. Missing Season is explicit and
  blocks playable routes while preserving Profile. Generic 401 is described honestly.

## Pinned API compatibility and backend handoff

No new endpoint, new auth scheme or unmerged backend change is required to run this
frontend against the inspected deployed contract. No backend runtime PR is required
for the legacy-compatible path. An open backend B1 PR was not found at inspection;
the following additive error handoff remains for the backend B1 task. Do not describe
it as already merged. This PR must not be deployed as an activation of later batches.

| Endpoint | Request | Response consumed |
| --- | --- | --- |
| `GET /api/v1/bootstrap` | `Authorization: tma <raw initData>`; Accept JSON; no client player ID | player, progression, nullable Season, config and five nullable feature summaries below |
| `GET /api/v1/profile/overview` | same auth | validated identity/photo, progression, journey, customization; existing endpoint |
| Existing notification/DLX reads | same auth | existing adapters; caches now scoped; optional failures cannot invent identity/progression |

Exact legacy Bootstrap schema:

```text
player: { telegram_user_id: integer, first_name: string, last_name: string, username: string }
progression: { lifetime_points: nonnegative integer, level: positive integer,
  current_threshold: nonnegative integer, next_threshold: positive integer|null,
  points_into_level: nonnegative integer, points_remaining: nonnegative integer|null,
  dexo_stage: newborn|explorer|connector|specialist|vanguard|legend }
season: null | { code, title, status, starts_at, ends_at: string; season_points: nonnegative integer }
config: { version, effective_at: string } (additive config data is retained)
daily: null | { claimable: boolean; streak: nonnegative integer; cycle_day: positive integer;
  reward_amount: nonnegative integer; next_reset: string }
typing: null | { attempts_used, attempts_remaining, claimable_balance: nonnegative integer }
missions: null | { available_count, reward_ready_count, unclaimed_count: nonnegative integer }
referral: null | { status: string|null; verified_invites: nonnegative integer }
network: null | { group_count, active_group_count: nonnegative integer }
```

Runtime Zod contract lives in `src/integrations/api/bootstrapContract.ts`; fixtures
come from this inspected schema, not production account creation. Season `ACTIVE`
maps to live, CLOSED/ARCHIVED to ended, other states to unavailable/prelaunch.
A null Season has the explicit sentinel `no-active-season` and no active Season flag.
The UI uses server points-into-level and points-remaining, not a demo level formula.

| Failure | Frontend treatment / backend contract |
| --- | --- |
| SDK asset failure / missing launch raw data | `SDK_LOAD_FAILED` / `LAUNCH_DATA_MISSING`; recovery, not browser misclassification |
| No hints/credentials/native bridge | `NO_TELEGRAM_CONTEXT`; genuine browser launch guidance; explicit local demo still works |
| Deployed 401 `{detail:"Unauthorized"}` | `AUTH_REJECTED`: rejected or expired; no automatic retry and no invented expiry diagnosis |
| Additive B1 401 `{code:"AUTH_INVALID"}` or `{code:"AUTH_EXPIRED"}` (also `error.code`) | Exact invalid/expired UI; server must decide after HMAC/age verification |
| Fetch rejection / bounded timeout | `API_UNREACHABLE` / `NETWORK_TIMEOUT`; bounded retry then manual recovery |
| HTTP 5xx / unavailable route | `API_UNAVAILABLE`; bounded retry |
| 429 | `RATE_LIMITED`; user-paced recovery; no automatic retry loop |
| Invalid Bootstrap JSON/schema | `RESPONSE_INVALID`; no fake data or arbitrary backend exception/PII display |

Backend handoff: preserve the legacy Bootstrap schema and `tma` auth; publish typed
OpenAPI and additive machine error codes without changing signature/expiry enforcement.
A generic deployed 401 cannot conclusively distinguish tampering from expiry. No client
clock or unsigned auth_date is used to make that security decision. Future schema
changes must update both fixtures and validators against a pinned backend PR/commit.
No live backend runtime/staging integration or PostgreSQL test was run here.

## Existing Playwright failure review

The previous audit reported 17 passing / 15 failing. The available suites contain 32
project scenarios; this run reproduced **18 passing / 14 failing** with system Chromium.
The one-count difference is retained as an unreproduced baseline variation, not erased.
All existing scenarios remain; no skips, screenshot updates, assertion removals or
inflated timeouts were used.

| Scenario/category | Decision and repair |
| --- | --- |
| Onboarding `First contact` expectation (mobile/desktop) | Test outdated: approved screen uses personalized WELCOME and the journey heading. Assert the actual heading. |
| Navigation is icon-only (mobile/desktop) | Test outdated: approved nav includes labels. Keep all five accessible-button assertions and verify visible Base label. |
| Base `Defend your clan signal` (mobile/desktop) | Test outdated: current approved heading is `Defend your clan outpost`. |
| Earn `Build your signal.` (mobile/desktop) | Test outdated: current approved heading is `Grow your journey.`. |
| Typing tab/headings ambiguity (mobile/desktop; reported extra flaky case) | Test ambiguity: scope to Earn sections and exact Typing/Typing Arena names, including the permanent Arena scenario. |
| Profile `First Referral` Got it (mobile/desktop) | Test outdated for this unlocked actionable item: expect `Feature achievement`. A separate locked informational scenario verifies Got it and Escape. |
| Profile background interactivity, exposed after CTA correction | Real accessibility regression: root was not inert. Restore background inertness while portal is open and exact previous state on close. Keep viewport/scroll/inert assertions. |
| Animated Dexo stability (mobile/desktop) | Test automation mismatch: approved target continuously floats. Use physical center pointer input, then assert the same approved Dexo image and button remain visible. Animation/CSS are unchanged. Old `DEXO` text expectation was also outdated. |

New coverage includes SDK failure with valid raw recovery, delayed initialization,
normal production browser versus explicit browser demo, missing data, invalid/expired
and legacy-generic credentials, protected Bootstrap headers, account/Season/config
cache isolation, timeouts, retry/error classification, cold onboarding/refresh/navigation,
local official SDK hash/SRI and informational modal keyboard/background behavior.

## UI/UX Preservation Report

**No CSS, typography, colors, spacing, page layouts, navigation, approved artwork,
Dexo component, Dexo animations, responsive breakpoints or modal appearance changed.**
No visual redesign or screenshot-baseline replacement was performed.

Necessary user-visible changes only:

1. Existing AppLoader/AssetImage/Button and Foundation error styling are reused for
   launch/auth/network/retry/empty-Season states on initial routes. New state text,
   Retry/Open Telegram actions and a compact native details disclosure distinguish
   real failures. No new stylesheet, color palette or component styling is added.
2. Profile modal background navigation becomes inert while open; focus trapping,
   existing animation, portal, dimensions, safe areas and scrolling are preserved.
3. Existing identity, avatar, Level, XP, Dexo stage and Season slots now show validated
   backend values rather than unsigned/demo values. Server stage selects the existing
   approved stage artwork. Existing captions, structures and image assets are retained.
4. Diagnostics shows SDK/launch status and credential presence instead of printing
   unsigned names or deep-link values. It uses the existing diagnostics layout.
5. SDK launch detection can correctly apply the already-approved Telegram layout
   and fullscreen/safe-area behavior after delayed initialization; no new policy.

## Validation and release gate

Results and hosted CI links are recorded in the PR and completed evidence appendix.
`npm test` discovers only `src/**/*.test.{ts,tsx}`; Playwright owns `e2e/` independently.
The GitHub Actions workflow runs full validators/typecheck/unit/production build and
separate Playwright demo + authenticated bundles, uploading reports/screenshots/traces
on every run. Mock tests intercept every API route and assert GET-only requests.
No authenticated or reward-producing production requests are used by this workflow.

Default sandbox browser preview failed on local binding; unrestricted test-process
permission allowed use of the installed `/usr/bin/chromium`. Downloading Playwright's
pinned Chromium in Cloud was denied (`cdn.playwright.dev` 403). Local system-Chromium
results are not a claim that the pinned CI browser or actual Telegram WebViews passed.

Read-only production HEAD checks on 2026-10-14: API root 404 (reachable transport,
not authenticated health), dalexio.com root 200. No authenticated Bootstrap, player
creation, Tap, Daily, mission, notification-read or Profile mutation hit production.

Known limits / rollout:

- Browser fixtures do not verify Telegram HMAC or actual native WebView delivery.
  Backend signature/expiry checks are unchanged; device/staging pairing remains a gate.
- Generic deployed 401 has the documented precision limit until additive error codes.
- Base Tap daily cap, local optimistic accounting, pending queues and old reward protocol
  remain B2 concerns. Their earning rules have not changed. Initial canonical data is
  server-owned; the existing Tap-specific optimistic presentation remains until B2.
- Earn/Typing/Clan/Arena/Profile collection feature workflows beyond their shared
  initial progression/identity state are still the existing partial/demo integrations;
  B1 does not claim B3–B6 delivery or production launch readiness.
- Existing bundle-size warning remains; no speculative redesign/performance rewrite.
- Frontend branch protection and backend PH-037/PH-043 require owner follow-up.
- No merge, production deployment, migration, reward change or next-batch start occurred.
  The pre-existing Vercel integration automatically published a branch preview; see
  the explicit exception and prevention below.

Rollout: keep this PR Draft pending review, hosted CI and device evidence. Use a
non-production authenticated staging pairing for API/native verification. Frontend
rollback is reverting this batch; it introduces no database or ledger migration.
No backend unmerged dependency is activated. Owner approval and independent PR/CI
review remain required before merge or the next batch.

## Required real Telegram validation matrix

Every row is **pending external device validation**, even if browser fixtures pass.
Capture client/app version, OS, network/carrier, VPN status, launch surface, time,
privacy-safe SDK/context/credential-presence/error-code diagnostics and screen recording.
Do not record raw initData, auth hashes, bot secrets or unredacted personal data.

| Client | Connectivity | Launch surfaces | Required checks |
| --- | --- | --- | --- |
| Android Telegram, minimum supported + current | VPN off/on; representative filtered and unfiltered Wi-Fi/cellular | Main Mini App, Menu button, cold startapp/deep link | Local SDK, signed Bootstrap, fullscreen, safe areas, haptics, onboarding, resume/refresh |
| iOS Telegram, minimum supported + current | Same VPN/network matrix | Same launch surfaces | Native viewport/insets, fullscreen capability, keyboard/scroll/modals, authenticated identity |
| Telegram Desktop Windows/Linux/macOS | VPN off/on | Main/Menu/deep links, native normal/fullsize | Portrait canvas, native shell unchanged, identity, refresh, navigation |
| Telegram Web A/K if supported | VPN off/on | Web Mini App iframe/deep link | Official bridge/LaunchParams, parent messaging behavior, auth, layout |
| All supported clients | API unreachable/timeout, SDK asset blocked, slow initialization | Cold launch, background/resume | Accurate recovery codes; retry without fake identity/progression; reopen expired session |
| All supported clients | Account switch, Season/config turnover | Same tab, relaunch, fresh credentials | No prior player/Season cache; onboarding isolation; null/closed Season UX |
| Ordinary mobile/desktop browser | No Telegram context | Direct route | Production launch guidance; explicit dev/local demo only |

Backend HMAC tampering, expiry boundaries and real player creation must be verified
against mocked/staging authentication fixtures or backend isolated tests, never by
creating production users from this Cloud task. Reachability from Cloud does not
prove VPN-off reachability on users' devices.

## Completed local evidence

- Baseline: 33 unit tests passed with Playwright excluded; default unit discovery was incorrect.
- Browser review baseline: 18 passed / 14 failed; previous audit was 17 / 15.
- Final unit suite: **66 passed, 16 files, zero failures** (`npm test`).
- Final browser suite: **62 passed, zero failures**, 3.2 minutes, installed system
  Chromium, both demo and authenticated mobile/desktop projects. All original 32
  scenarios retained; 28 B1 scenarios plus two informational modal scenarios added.
- `npm run check`: structure/assets/imports/motion, full TypeScript, unit suite and
  production build passed. Final fullscreen-recovery guard has an additional passing
  regression test; hosted checks verify the complete final commit.
- `npm run validate:telegram-sdk`: official snapshot SHA-256 and HTML SRI passed.
- `git diff --check`: passed. No CSS file changed; no screenshot assertions updated.
- Required actual-device VPN/native, staging paired-backend and independent owner
  review are outstanding. Hosted CI evidence is linked in the Draft PR.


## Hosted CI and automatic preview exception

Implementation head: `8e5391e8c07bb5665b9b683d9f6a99dcb19ef1b1`.
[Draft PR #2](https://github.com/hassan-anari/Dalexio-Game/pull/2) targets main.

[PR Actions run 38557885461](https://github.com/hassan-anari/Dalexio-Game/actions/runs/38557885461)
and [push run 38557882614](https://github.com/hassan-anari/Dalexio-Game/actions/runs/38557882614)
both failed before executing steps. Browser and unit-build jobs have no steps or
available log archive (log retrieval returned BlobNotFound). GitHub reports failure;
this is **not passing CI or a failing application assertion**. The public job annotation states: “The job was not started because recent account
payments have failed or your spending limit needs to be increased. Please check the
Billing & plans section in your settings.” The owner must resolve this GitHub account
billing/spending restriction and rerun the existing workflow. The API connector did
not expose annotations; the reason was verified on the public Actions job page. No
required checks were removed, disabled or marked successful. B1 acceptance is blocked
on hosted execution at that attempt. The final PR CI evidence supersedes this historical failure. Do not merge or start B2 without completed checks and owner approval.

The existing Vercel Git integration automatically created a **branch preview** when
this requested PR branch was published. Its status reports Deployment has completed:
https://vercel.com/forgers/dalexio-game/3vhzJ4Z8hz5Fs4M1qNoQdDEiYMv3 .
No manual deploy command was issued and production main was not changed, but the
preview is an exception to the requested no-deployment scope and is disclosed, not
concealed. The branch-specific `git.deploymentEnabled` setting now disables further
Vercel deployments for `ai/b1-frontend-foundation`; it does not change main's policy.
No Vercel management credential/tool is available to cancel/remove that already
completed preview. The owner can remove it in Vercel. No authenticated preview or
production gameplay was exercised. Vercel success is **not** Playwright/CI evidence.


Repository identity note: during final handoff GitHub began redirecting the original
Dalexio-Game name to `hassan-anari/FROCAL`. Both names resolve to the same immutable
repository ID `1312056109`, same PR #2, base and implementation head. No repository
rename or visibility change was performed by this task, and the local remote remains
unchanged. Follow-up publication uses the server-returned canonical repository name.


Actions rerun after the owner renamed/made the same repository public: attempt 2
of the above runs started successfully, then both jobs failed in actions/setup-node
because the repository did not contain a committed dependency lockfile. The initial
CI addition missed that prerequisite. A lockfile generated offline from the existing
installed dependency tree is now committed, keeping npm ci and npm caching enabled.
No tests or checks were weakened. The new commit's CI result supersedes that failure.


The first offline lockfile reconstruction contained versionless placeholders for
platform-specific optional packages from the Cloud dependency tree; npm ci rejected
it before tests ran. The corrected lock resolves that missing metadata in an isolated
registry-backed directory and passes a **clean npm ci** (237 installed packages).
Every previously installed package version remains unchanged. No npm cache/check is
disabled. Final review also added a regression preventing the official SDK's same-tab
merge from carrying a prior account's credential into a new incomplete launch; fresh
SDK credentials still recover. The final unit count is 66.
