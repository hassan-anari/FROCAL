# B4 frontend implementation and review evidence

Delivery: [FROCAL Draft #5](https://github.com/hassan-anari/FROCAL/pull/5), branch `ai/b4-profile-arena-ui-restoration`. P-08/P-09 and all authorized B3 corrections are in this single Draft. No merge, deployment, live reward calls, real Telegram sends or production data reset.

Backend: [WEDCAL Draft #29](https://github.com/hassan-anari/WEDCAL/pull/29), exact runtime/source/fixture pin **`ec6af7053dfc7e8755998418b826c59ca91191ea`**. This supersedes initial runtime `9a43048` and documentation-only `2d2a856`. Historical B3 remains **`c3f8f27d18fda66b62e22c6cadd1480e1f0f4370`**; B2 remains `34328c76ba3377396660b1549bf8e370ac514a71`. Separate source/fixture Git blobs and CI checkouts enforce each pin. See [contract](../scripts/contracts/b4/source/docs/B4_BACKEND_CONTRACT.md), [handoff/migrations](../scripts/contracts/b4/source/docs/B4_BACKEND_HANDOFF.md), [OpenAPI/fixtures](../src/integrations/api/fixtures/b4), and [mapping](B4_BACKEND_REQUIREMENTS.md).

## Preserved UI and backend behavior

The [Before/After preservation matrix](B4_UI_PRESERVATION.md) records each touched screen, existing components/actions reused, removed unauthorized B3 additions, authorized differences and server data bindings. It links mobile evidence at 320×700, 390×844 and 460×900. Profile/Arena artwork, typography, spacing, approved overlays, navigation and motion remain; existing Wallet/Account and Season 2 locked surfaces are preserved.

- Profile overview, journey, lifetime XP/levels/stages, achievements, collection and customization use authenticated server state. Existing sheets preview immediately and save/equip only after confirmation; uncertain writes reconcile. No local unlock or reward authority.
- Daily, Mission and Typing claims reuse the original `RewardReveal` and `LevelUpReveal`. Positive, newly created B4 ledger receipts supply exact XP and before/after progression. Event identities are deduplicated across retries/remounts; simultaneous rewards queue without repeating a level boundary. Daily/Mission pending states remain isolated. Raw success/reset paragraphs and duplicate Completed labels are removed; Typing Claim exists only on the Earn dashboard.
- TODAY history uses `/typing/history?period=current`, server period boundaries/key and persisted run periods. Rows preserve the approved WPM/accuracy/time/score presentation. Score is server display score, separate from wallet credit; nullable metrics use the existing em dash. Cursor rollover clears stale pages and reloads page one. A one-shot server-boundary timer, mount/focus revalidation and existing-row scroll continuation require no local calendar policy or new controls.
- Referrals and communities consume actual private `photo_url` through the existing avatar/fallback. Start-only pending invitees remain supported. Network entry/focus/resume revalidates authoritative state without interval polling or manual controls. The existing Telegram group picker remains; intent authorization defaults false because no new messaging consent copy/control was approved.
- The sole Notification Center uses actual cursor pages, authoritative unread count, confirmed per-item reads and server read-all. Only documented `deep_link.path` can navigate an existing allowlisted internal route; payload URLs are ignored. The explicitly approved transient error/info layer reuses Notification Center classes, Hugeicons, tokens and motion, with no controls/history or reward success.
- Current Player/Clan Rankings use existing podiums, rows and own standing, server ordering and pagination; overlapping live-page identities are displayed once without client re-ranking. Ranking IDs are internal database IDs, distinct from Telegram scope IDs. Explicit season reads and server continuation metadata prevent cross-season mixing. Archive standings and off-chain DLX are typed/tested read capabilities; no new archive or allocation UI is introduced.
- Session Recovery changes one inline property: 12px horizontal space between the existing buttons. Retry, switching confirmation, fencing and recovery logic are unchanged.

## Verification

| Gate | Local result |
|---|---|
| `npm run check` | Structure/assets/imports/motion/production policies, separate B2/B3/B4 blob checks, semantic TypeScript, **216 units**, production build and bundle exclusion passed |
| ESLint correctness checks on changed production TS/TSX | Passed with isolated ESLint 9/TypeScript parser tooling; repository lint validators also passed |
| Original browser matrix | **134/134** mobile/desktop scenarios passed |
| B4 browser/visual gate | **17/17** passed: rewards/duplicates/isolation, Profile confirmed/rejected writes, images/fallbacks, navigation, rankings, notifications, TODAY reset handling and Recovery at all three widths |
| Historical B2 pair | **15 API/controller + 6 production browser** passed at its unchanged pin |
| Historical B3 pair | **29 API/controller + 13 production browser** passed at its unchanged pin; consent API compatibility retained, removed consent UI replaced with automatic refresh/absence proof |
| Final B4 pair | **9 actual PostgreSQL/Redis API/controller + 16 production browser** passed at `ec6af70`, including current-period rollover/foreign anchors, real history, archive/DLX, private invitees, notification read-all and cross-player isolation |

CI runs all five jobs, including a separate final B4 backend checkout. The PR records final-head job URLs/results and artifacts. `npm run test:visual:b4-baseline` rebuilds the exact pre-edit UI commit `ae91624f23a48d8a9973154520284706a9df1c21` in a verified worktree. CI renders before and after with the same browser and keeps both; the four unchanged full-screen comparisons retain their 0.2% tolerance. It never auto-approves the B4 image as the baseline. Data-bound/authorized differences remain visible in the full matrix and pixel report.

Paired tests use guarded isolated localhost PostgreSQL databases and Redis database 15. Real HMAC authentication, canonical ledgers, entitlements, APIs, locks, projections, idempotency and migrations run in WEDCAL; external Telegram/storage boundaries use synthetic transports. Signed launch data is excluded from browser traces/videos/screenshots. Mobile captures use synthetic HTTP fixtures, not production balances or user photos. Chromium emulation does not certify physical Telegram performance; approved motion rules and reduced-motion behavior are covered by validators/browser checks.

## Owner-design decisions and review

- Archive selection has no approved selector and remains explicitly deferred by the owner. Current-season rankings are complete.
- Visible DLX allocation has no approved presentation component and remains explicitly deferred. There is no balance card, claim, trade, transfer or wallet flow.
- First Verified Activity's conditional secondary active-days presentation has no published authoritative progress/target evidence. Its existing component is retained; no secondary days or target is fabricated. A future visible counter needs an owner-approved metric/contract.

The owner must review the UI evidence alongside test results. No backend rollout flags, public Welcome, image storage, production migrations, merge or deployment were activated by this work.
