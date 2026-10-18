# Post-B6 production QA hotfix

Base: FROCAL main `e481ffa7e14b980b7e1922cc2d71e64374014596` (B6 merged, PR #7 API routing retained). Branch: `hotfix/post-b6-production-qa`. Draft only; no merge or deploy.

## Independent frontend corrections

- History keeps confirmed row DOM through background refresh and pagination. Initial loading appears only without confirmed rows. Load More owns pagination progress and is disabled during any fetch; a synchronous guard also prevents manual/intersection duplicates.
- FACILITIES uses the authoritative equipment response: real names of distinct effective TIMED items, `name +N`, or the sum of unused owned quantities (including zero). Effect categories from one item do not inflate the facility count; expired, future, ineffective and CONTEXT effects are excluded. EFFECTS consistently counts effective timed effect rows, separate from distinct items.
- The equipment display uses the current server anchor on each tick, after refresh and foreground resume. Existing Shop/Inventory permissions and prices remain authoritative.
- The Clan header has a smaller top margin, a compact aligned status button, balanced spacing and wrapping long names. Hero, branded typography/colors, artwork, navigation and motion remain.
- Confirmed leave, including 204/null, fences old membership immediately, cancels old reads, removes obsolete Clan caches and refreshes current role/membership/requests. Old scoped failures and nonessential account refreshes cannot turn success into a mutation error. A real write failure retains meaningful error feedback. Only an essential current-state read failure reports successful leave with a refresh notice.
- Backend notification titles/bodies remain preferred. Blank legacy fields have safe display fallbacks; CLAN_INVITE_READY explains the invitation and Clan Status. Invite-ready navigation always uses `/clan`; payload URLs/credentials are never used. Credential-bearing legacy copy is replaced safely.

## Contract-dependent work — pending published handoff

The owner confirmed the WEDCAL post-B6 contract is not published yet. The formal process is WEDCAL handoff in FROCAL Issue #8, then explicit consumer acknowledgement, exact pin and paired acceptance. Coordination request: WEDCAL Issue #32.

The existing B6 checkout pin **`589210a8e28436c2110fa60b1ee9e12ddb05ccc8`** remains unchanged. It is not a post-B6 pin. No speculative backend fields/error codes or early category requests are introduced.

Pending: server-filtered Network History cache/query and returned cursor, governance readiness/actionable conflicts, exact successor OpenAPI/fixtures/runtime pin and fresh paired tests. Until that handoff, the retained client filter and unfiltered History endpoint are known existing limitations. Base individual rewards and `/clans/activity` remain separate.

## Validation in progress

- Focused: 6 files / 50 tests passed.
- Retained B6 async/history: 14 browser scenarios passed.
- Full `npm run check`: 49 files / 358 tests passed; build/bundle completion pending.
- Main baseline captures: 3 widths passed (320/390/460 px, 740 px height), immutable base checkout.
- New mobile functional/visual checks and complete hosted CI pending. Screenshots in `docs/evidence/post-b6/`.

The local browser is system Chromium because the environment policy denied the Playwright CDN download. Hosted CI installs Playwright's browser normally. Physical Telegram-device testing is not claimed.
