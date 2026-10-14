# B1 final cross-repository contract corrections

This is a correction to existing frontend [Draft PR #2](https://github.com/hassan-anari/FROCAL/pull/2),
not a new batch. Frontend correction base: `26a3210c69ddd014ede290469b36e5780ffc54c1`.
Backend reviewed pairing: [Draft PR #26](https://github.com/hassan-anari/WEDCAL/pull/26)
at **`cadc257fbed5c6bf36e31c767e70f4cd430e350d`**. No backend or frontend merge,
production deployment, new batch or Tap economy change is included.

## Exact contract consumed

The reviewed `apps/rewards/schemas.py` defines BootstrapOutput, BootstrapFeatures,
BootstrapGameplay, BootstrapConfig and BootstrapProgressionPolicy. The frontend
now validates/preserves these additions rather than stripping them:

| Additive field | Frontend treatment |
| --- | --- |
| contract_version, request_id, server_time | Validate contract 1.1 and metadata; use server snapshot time/correlation when provided |
| player.id, language_code, photo_url | Preserve typed verified metadata; canonical server id scopes caches; verified HTTP(S) avatar feeds existing image slots |
| config.schema_version, payload_checksum | Retain typed config identity and include it in dependent-cache scope |
| config.progression.levels | Typed level/min-lifetime-points rules exposed from useBootstrap.progressionPolicy |
| config.progression.dexo_stages, clan_min_level | Typed policy retained; Clan threshold uses config when supplied |
| features | All ten reviewed booleans validated; explicit false overrides legacy derived defaults, including Clan and Arena |
| gameplay | Moderation state and separate reward_earning_allowed retained; read availability is not earning eligibility |

Additions remain optional at the top/nested legacy-compatible boundary. When present,
the reviewed nested object fields must validate; malformed additions cannot disappear
silently. All legacy player/progression/Season/config and nullable feature summaries
remain accepted. Policy metadata is available for B2; no thresholds, lease, cooldown,
reward/batch/outbox algorithm or Tap configuration is implemented by this correction.

Authoritative feature availability takes precedence. Disabled Clan cannot expose role
selection even at/above its configured level. Below-threshold players keep the existing
locked Clan layout with its configured threshold data. Disabled features reuse the
existing B1 unavailable/retry state. Arena availability opens only its current Season 1
read experience; remote data always retains the approved locked S2 Warfront preview.
Feature true never grants frontend Season 2 gameplay or server authorization.

Reward eligibility gates new Tap intents and existing prototype Earn/Typing reward
actions separately from read access. A suspended player can still read Profile/Arena.
FLAGGED is not independently interpreted as a ban: the server earning boolean decides.
Dexo interaction/animation/haptics remain while earning is unavailable. Existing legacy
Tap outbox recovery is not rewritten or deleted; backend eligibility still independently
authorizes any submitted request. B2 migration/economy work remains out of scope.

Avatar metadata is always retained as a server string in the validated remote payload.
Only absolute HTTP(S) URLs enter existing avatar components; invalid/unsafe URL strings
become a null image source. Explicit B1 photo metadata has priority over older optional
Profile reads. Unsigned Telegram user names/photos are used only in explicit demo mode,
not as authenticated player metadata. Arena's own-player identity now follows Bootstrap.

## Reviewed error taxonomy

`apps/core/api_errors.py` at the same backend SHA defines the error envelope and codes.
The API client now consumes them independently from launch/network classification:

| Status / code | Behavior |
| --- | --- |
| 401 AUTH_MISSING / AUTH_INVALID / AUTH_EXPIRED | Credential recovery/reopen; no automatic credential retry loop |
| Legacy generic 401 | Existing honest AUTH_REJECTED (rejected or expired) behavior |
| 503 AUTH_UNAVAILABLE | Authentication service outage; at most two automatic read retries, then manual Retry; no misleading renewal/Open Telegram advice |
| 503 INITIALIZATION_UNAVAILABLE | Config/provisioning/initialization outage; same bounded retry policy |
| 400/422 REQUEST_INVALID | Sanitized invalid-request state; no automatic retries |
| Unknown/non-JSON errors | Existing safe HTTP/network fallback; arbitrary detail never displayed |

Safe request_id in the error body is used when a safe X-Request-ID is absent. Unsafe
correlation strings are rejected even for parse/schema errors. Raw server detail,
headers, signed initData, auth hashes and credentials are never surfaced in messages.
Protected-request signed authentication remains unchanged.

## Exact paired schema fixture / isolated harness

`scripts/contracts/backend-bootstrap-schemas.py` and `backend-api-errors.py` are
byte-exact snapshots of the reviewed source, verified against Git blob hashes
`78075564dcecad58f1815fee067d0f7aa474ce88` and
`a1aa7d1fa5ba1988ad0d5c9c291a8bb6ed8a455f`.

The generator imports their actual Django Ninja Schema classes with reviewed uv.lock
versions: Django 5.2.17, django-ninja 1.6.3, Pydantic 2.13.4. Synthetic Bootstrap/error
values are validated/serialized through those models. The backend JSON Schema and
source pin are generated alongside the frontend JSON fixtures. Frontend tests require
full fixture equality after Zod parsing and verify mapping/behavior; Playwright uses
the same fixture with an intercepted GET-only API. CI recreates/checks the artifacts
before running the complete frontend suite.

The harness loads DTOs only, with no backend app models, database, API origin or bot
credential. It performs no auth provisioning, HTTP calls, player creation, mutations
or production traffic. Synthetic progression values are schema fixtures, not approved
production balancing data. This proves the reviewed DTO pairing, not live backend
services, HMAC, PostgreSQL, staging integration or actual Telegram WebView behavior.

## Regression and validation evidence

New tests cover exact field retention, disabled high-level Clan, server Arena flags,
legacy response compatibility, validated player metadata, safe image URLs, config
checksum/schema turnover, typed policy exposure, separate read/earning eligibility,
all reviewed error codes, bounded service retries and sanitized correlation/details.
Existing authentication, player/Season/config isolation, launch recovery, navigation,
onboarding, modal and demo scenarios remain.

Commands: schema harness --check; npm run check (structure/assets/imports/motion,
full TypeScript, unit tests, production build); npm run validate:telegram-sdk;
full Playwright mobile/desktop demo and authenticated suites; git diff --check.
Local result: **83 unit tests in 17 files and 72 Playwright scenarios passed, zero
failures**. All original 62 browser scenarios remain; five correction cases run on
both mobile and desktop. The initial new-fixture Node import error was repaired by
reading the generated JSON fixture with Node's filesystem API; assertions were not
changed. Local browsers use installed system Chromium with permitted server binding;
hosted CI uses the pinned Playwright browser. Exact frontend head and fresh GitHub
Actions job/artifact links are recorded in the updated PR description. No failed assertions are suppressed,
no scenarios skipped, no screenshot baselines or timeouts changed.

## Updated UI/UX Preservation Report — correction delta

**Zero approved CSS, layout, typography, colors, spacing, artwork, Dexo animation,
navigation or modal-design changes.** No new visual component or stylesheet. No
modal, DexoStage, GameShell or navigation component is edited by this correction.

Changes to existing visible states are data interpretation only:

- Existing identity/avatar/Clan threshold slots receive validated backend data.
- Existing locked/unavailable states are selected when server policy disables access.
- Existing Earn action disabled states reflect server earning/feature eligibility.
- Existing B1 error/retry components show sanitized service versus credential states.
- Remote Arena retains its existing Season 1 layout and locked Season 2 preview.
- Dexo companion interactions remain; ineligible interactions create no new Tap credit.

No visual alteration requiring a new owner design decision was introduced.

## Compatibility / review gate

The additive backend PR is still unmerged. This frontend keeps the inspected deployed
legacy response path; it does not require unmerged additions at startup. Exact flags,
checksum/policy metadata and precise error codes improve behavior when supplied by
backend PR #26. Legacy fallback Clan Level 5 applies only when the server supplies
neither authoritative flags nor a configured threshold. Legacy 401 remains ambiguous.
Absent legacy eligibility data preserves existing behavior, while backend authorization
continues to enforce actual rewards.

Actual Telegram VPN-on/off/native device tests and full service/staging pairing remain
external acceptance gates. Existing bundle-size warning and later B2–B6 feature work
remain. No claim of production launch readiness, real-device validation or new economy.
Both paired Draft PRs need independent review and explicit owner approval before merge.
STOP after the updated frontend PR has green checks and the final handoff.
