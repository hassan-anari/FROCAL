# B5 frontend implementation report

**Status: INCOMPLETE — Draft PR #6; no merge or deployment.** P-10/P-11/P-12 final binding and paired acceptance await the actual WEDCAL B5 runtime contract/fixtures, plus owner decisions for required missing Clan surfaces. Approved Network/Notification/Banner/Base/Earn work is implemented in this same PR.

Repository: `hassan-anari/FROCAL`; branch `ai/b5-clan-frontend`; approved starting main `ef6f1fca4de541e6eb45c9b8bf3e114bbd163cfb`. Current review head is the PR head; evidence-specific source commits and commands are recorded below. Paired backend draft: WEDCAL [#30](https://github.com/hassan-anari/WEDCAL/pull/30). Its initial handoff `75a43e5e0aa7f0a17092218237da7c88b8996909` explicitly is **not** an implementation pin.

## Implemented behavior

- **A1:** Inspected actual EarnPage avatar rendering, AvatarContent/useAvatarSource, computed styles and mobile photographic baseline. Existing photo container had zero border/shadow/padding but retained the cyan initials background behind rounded clipping. A group-only selector removes that background when an image exists. Size (34px at 320; 38px at 390/460), 13px corners, content/crop/loading/failure handling and missing/failed initials remain. Shared avatars are untouched.
- **A2:** Scoped Network Group Expansion CTA becomes 46px rather than 64.3125px; trailing icon container becomes 34px. Existing full width, gradient, arrow/label, rounding and add-to-group action remain. Shared Button unchanged.
- **A3:** Notification Center glyph content is `String(index + 1).padStart(2, "0")` over the flattened visible page order. Backend UUIDs still identify all read mutations/navigation. Glyph dimensions/tone/state/copy/time and Toast icons are unchanged.
- **A4:** Audit found the current frontend already permits arbitrary properly validated external HTTPS destinations and uses Telegram `openLink`, preserving query strings. No banner runtime/UI or shared navigation policy change was needed. Added external-domain/query/malicious URL and browser adapter regressions; existing lifecycle/error tests remain.
- **Earn History:** Enabled the approved header History action and reused HistorySheet. `useRewardHistory` consumes the existing authenticated `/rewards/history?limit=20&cursor=…`; exact source/context/player_amount/occurred_at map directly to rows. Signed and zero player amounts are represented correctly; no reward title is invented. Scroll continuation uses the server cursor, with monotonic cursor protection, overlap deduplication, and loading/empty/error/partial-error handling. No new modal or control.
- **Base objectives:** Replaced all hardcoded objectives with up to three available actionable `/missions` rows, stably ordered `REWARD_READY`, `IN_PROGRESS`, `AVAILABLE`. Uses server title/state/reward; excludes unavailable/claimed/untitled rows, shows fewer when necessary and no percentage absent measurable evidence. Existing Timeline/All missions remain; circle fills are solid turquoise/orange/gold without glow.
- **Base Recent Rewards:** Removed the fictional last-visit feed. Same card styling now displays up to three genuine nonzero XP ledger records with category/context/time; hidden when none. Same authenticated player/session/season/config-scoped infinite-query cache as Earn History. Canonical receipt advancement invalidates this cache; stale/unrelated receipts do not. No Last Visit checkpoint is invented.
- **Production Clan containment:** Historical mock/local Zustand state cannot unlock remote Clan, even with a server feature flag or poisoned local storage. Existing locked presentation remains until the actual pinned B5 adapter replaces this closed gate; local diagnostic designs remain. No simulated purchase, balance, XP or trophy becomes production truth.

## Contract and UI decisions

[Backend requirements and exact gaps](B5_BACKEND_REQUIREMENTS.md) inventory all approved Clan surfaces against actual historical backend source. No speculative B5 endpoint or fixture has been created. [UI preservation matrix](B5_UI_PRESERVATION.md) identifies every authorized delta and unchanged surface.

Required owner decisions before adding surfaces: pending-request cancellation; accepted invite/DM/Telegram verification/credential recovery; leave consequences; governance/removal/voting; inactivity/admin loss/emergency/recovery/dissolution. Existing approved ClanModal can provide the design basis, but those actions are absent from the approved current UI. No new surfaces have been implemented without approval. Backend-owned PH-045 and PH-048 remain isolated; no recreated lifecycle or first-milestone predicate is invented.

## Pin state and compatibility

| Batch | Preserved implementation pin |
|---|---|
| B2 | `34328c76ba3377396660b1549bf8e370ac514a71` |
| B3 | `c3f8f27d18fda66b62e22c6cadd1480e1f0f4370` |
| B4 | `75992805c1df2235a7513ddd6aa5864df65dd5c3` |
| B5 | **Not issued** — actual runtime/schema/generated fixture handoff pending; planning SHA will not be used |

Historical pin files and source/fixture bytes are unchanged. Add separate `scripts/contracts/b5-pin.json`, actual source/fixture blob checks, immutable paired checkout and B5 paired CI only after the real handoff. Existing history source schema was audited at WEDCAL main `6aaa362daecec86107babd95224398e7e1ac7e75`; this does not turn that SHA into a B5 runtime pin.

## Verification evidence

- `npm run check`: passed locally (39 test files / 248 tests at the initial validation snapshot), including TypeScript, repository structure/assets/import/motion checks, 12 production-policy checks, historical contract blob checks, unit suite, production build and production-bundle exclusion. The additional canonical invalidation case subsequently passed its focused 3-test suite. No standalone ESLint/lint command is configured in this repository; the existing static validators and TypeScript are its current lint-like checks.
- Focused mission/history/cache/navigation/banner unit group: 59 passed.
- `npm run validate:telegram-sdk`: passed, official SDK hash/SRI unchanged.
- B5 browser corrections/data suite: **11 passed**, covering all data/visual cases and full Telegram external-link regression through the initialized official SDK.
- Mobile before/after: `docs/evidence/b5/{320,390,460}/`, clean baseline commit and renderer in `baseline-provenance.json`. Real photographic bytes are local NASA/scikit-image public-domain fixture data; they are not live owner group photos. Successful-photo, missing-photo and failed-photo cases included. Profile/Warfront pixel guards retained at all widths.
- Broader browser regression: **134 passed**, local mobile/desktop, 7.0 minutes. No retries/skips.
- Hosted validation at `fc2c7701dceabfacc52c058e47e6a2777d92cc4f`, [run 38944964983](https://github.com/hassan-anari/FROCAL/actions/runs/38944964983): unit/build green; B2 PostgreSQL **15 API/controller + 6 browser**, B3 **29 API/controller + 3 available-API + 13 browser**, B4 **9 API/controller + 16 browser**, all green. Six B4-only cases are intentionally excluded at the historical B3 pin and executed in the dedicated B4 job; do not count those as passed at B3. Browser job is still running. Successor-head evidence will be attached to the same PR.

B5 Captain/Soldier production E2E, governance/recovery/authorization and Treasury/shop/inventory concurrency/idempotency paired tests have **not** run: no actual B5 runtime pin exists. Browser synthetic responses validate presentation and cache logic, not Clan economic authority or physical Telegram WebViews.

## Deployment and residual risks

No migrations, production requests, Telegram sends, rollout, merge or deployment. No B6 work. The Draft must remain unmergeable as an overall B5 delivery until actual binding, approved missing surfaces and all required B5 paired checks are complete.

- P1 blocker: P-10/P-11/P-12 adapter/contract pin/paired acceptance pending backend runtime handoff.
- P1 blocker: owner design decisions for missing governance/leave/credential surfaces.
- Pending evidence: final hosted checks and physical Telegram mobile acceptance. Existing known bundle-size warning remains; no unrelated bundling refactor.

Changed paths are enumerated in [B5_CHANGED_FILES.md](B5_CHANGED_FILES.md). Stop for independent owner review after all required acceptance gates; the present blocked integration is not represented as completed B5.
