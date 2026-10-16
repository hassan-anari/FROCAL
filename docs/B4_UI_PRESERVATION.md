# B4 UI preservation inventory and review gate

Baseline: FROCAL `ae91624` (merged B3). Approved visual references: Phase 3.2.2, Phase 3.3, Profile Phase 4.1.3/closure and Arena V2. Inventory recorded before page edits. Existing local scenarios are visual test fixtures only.

| Screen | Existing components/actions/overlays to reuse | Unauthorized B3 additions to remove | Authorized differences | Backend binding |
|---|---|---|---|---|
| Earn / Daily | Daily card, seven day nodes, one Claim control; RewardReveal then LevelUpReveal; existing pathway, summaries and dock | Global raw success/loading paragraphs, raw Streak/reset line, extra global Retry panel | Owner-selected Hugeicons checkmark-circle-02; isolated pending state; owner approved replacing the completed heading with the existing “Claimed today” wording | Daily settlement amount and canonical projection only |
| Earn / Missions | Active/completed lists, number/icon, reward footer, single action; same reward overlays | Duplicate Completed text, raw success paragraphs | One Completed action label; per-mission pending state | Published mission definitions and server verification/claim |
| Earn / Typing dashboard | Attempts, arena entry, dashboard Claim, best stats, mission, TODAY history rows | Raw reset date, reward-claimed paragraph | Existing TODAY rows bind real current-period runs; no fabricated runs | Current-period history/claim; server score, nullable metrics and reset evidence |
| Typing challenge | Back navigation, Dexo, 30-second timer, phrase/input, scoring/results, existing start/finish/retry | Detail-page Claim, raw reset timestamp, raw page feedback/extra error Retry | Shared transient failure presentation | Existing issued attempt, exact retry/submission and server result |
| Network / Referrals | Copy/share, guide sheet, tier rail/metrics, latest five rows, avatar/initials, pending/active status | None of the existing roster hierarchy | Navigation/focus/resume revalidation | Existing invitees support start-only attribution; B4 private `photo_url` with existing fallback |
| Network / Communities | Group picker, guide, summary and existing group rows/status | Broadcast status/enable/revoke controls and consent overlay; manual Check status | Automatic revalidation; private images use the existing avatar/fallback | Existing registration/verification state and settled XP; B4 private `photo_url` |
| Profile Overview / Share | Identity/frame/title, compact Customize/Share, level bar, journey stats, showcase, symbolic share sheet | Production use of demo profile entitlements/customization | Existing save/equip/feature actions wait for server confirmation | Overview, achievements, collection, PUT customization; canonical lifetime progression |
| Profile Achievements / Collection / Customize | Existing filters, cards, detail sheet, locked Got it, frame/title/medal rails, live preview, Save profile | Demo unlocks/progress/rewards in authenticated views | Server entitlement/progress/reward values; existing locked artwork retained | Known catalog IDs map server keys; no new assets/design |
| Arena Warfront / Rankings | Locked S2 preview unchanged; Players/Clans toggle, podium/list/self-standing | Demo rankings/season figures in authenticated views | Existing rows bind actual current season; scroll loads server pages | Current/archive ranking and DLX typed reads; archive selector/DLX presentation deferred |
| Header / Notification Center | Existing bell/unread count, drawer, item, Mark all read, close | None | Safe allowlisted internal destinations; scroll pagination; confirmed read state | Existing notifications cursor/read API |
| Session Recovery | Existing background/copy/buttons and switch confirmation | None | Only spacing between Try Again and Switch to This Device | No fencing/recovery logic changes |

## Known contract / owner decisions

The B3 backend pin is `c3f8f27d18fda66b62e22c6cadd1480e1f0f4370`. The published B4 implementation is separately pinned at `ec6af7053dfc7e8755998418b826c59ca91191ea`; source/fixtures are hash-checked. The server now supplies authoritative Typing periods and persisted run keys; the existing TODAY list uses them directly.

- Backend now exposes real submitted Typing runs, server display score, and private invitee/group images. TODAY uses the published current-period filter, resets stale pages, and displays returned scores/nullable metrics; no client scoring, URL construction or inferred runs.
- Owner confirmed Arena archive selection has no approved control and remains blocked for design approval. This does not block approved current-season rankings. Do not repurpose Season 2 War History or the seasonal reward capsule.
- Owner confirmed Arena has no approved visible DLX allocation component. Preserve the typed read layer; visible allocation remains blocked for design approval and does not block current-season rankings. No wallet/card/claim interaction.
- First Verified Activity has a secondary active-days presentation, while the current achievements response exposes one progress/target pair. Do not infer active days.

## Evidence and validation

Screenshots, before/after comparisons, executed checks and outstanding gates are recorded below before delivery. Chromium mobile emulation does not certify physical Telegram WebView performance.


## Mobile screenshot review

The before images are the exact pre-edit `ae91624` release, rebuilt in a checked worktree by `npm run test:visual:b4-baseline`. CI captures that release and B4 using the same Playwright/browser installation and keeps both artifacts. This removes cross-platform renderer differences without replacing the approved source or loosening the comparison threshold. [Baseline provenance](evidence/b4/baseline-provenance.json). Both runs use identical synthetic HTTP fixtures, Inter fonts, reduced-motion settings and settled artwork/DeferredMount content. They are UI evidence, not production balances or physical Telegram measurements. All original artwork stays repository-maintained.

Full captures: [320px](evidence/b4/320), [390px](evidence/b4/390), [460px](evidence/b4/460). Each directory contains matching `before-*` / `after-*` PNGs. [Pixel comparison](evidence/b4/pixel-comparison.json) reports raw changed pixels; data-bound and explicitly authorized differences are not hidden by that report. Automated preservation assertions compare the four unchanged full-screen views with the actual pre-edit images, allowing only small rendering/antialiasing differences.

| Screen / state (390px) | Before | After | Interpretation |
|---|---|---|---|
| Base / shared header | [Before](evidence/b4/390/before-base-header.png) | [After](evidence/b4/390/after-base-header.png) | Identical layout, identity, dock and artwork. |
| Earn / Daily | [Before](evidence/b4/390/before-earn-daily.png) | [After](evidence/b4/390/after-earn-daily.png) | Removed raw Streak/reset paragraph; existing card/action retained. |
| Earn / Missions | [Before](evidence/b4/390/before-earn-missions.png) | [After](evidence/b4/390/after-earn-missions.png) | Same hierarchy; completion appears once. |
| Network hero | [Before](evidence/b4/390/before-network.png) | [After](evidence/b4/390/after-network.png) | Identical approved hero/cards; no new controls. |
| Referral roster | [Before](evidence/b4/390/before-referrals.png) | [After](evidence/b4/390/after-referrals.png) | Existing pending/active rows; no substitute current-user photo. |
| Connected communities | [Before](evidence/b4/390/before-communities.png) | [After](evidence/b4/390/after-communities.png) | Removed consent controls and Check status; retained original row/status. |
| Typing dashboard | [Before](evidence/b4/390/before-typing-dashboard.png) | [After](evidence/b4/390/after-typing-dashboard.png) | Raw reset timestamp removed; dashboard Claim preserved. |
| Typing history | [Before](evidence/b4/390/before-typing-history.png) | [After](evidence/b4/390/after-typing-history.png) | Same existing list surface; actual submitted current-period runs and server score. |
| Typing challenge | [Before](evidence/b4/390/before-typing-challenge.png) | [After](evidence/b4/390/after-typing-challenge.png) | Detail Claim/reset/raw feedback removed; scoring/timer/navigation retained. |
| Profile overview | [Before](evidence/b4/390/before-profile-overview.png) | [After](evidence/b4/390/after-profile-overview.png) | Identical overview composition for identical confirmed state. |
| Customize sheet | [Before](evidence/b4/390/before-profile-customize.png) | [After](evidence/b4/390/after-profile-customize.png) | Same viewport/safe-area sheet; actual entitlements replace demo unlocks. |
| Share sheet | [Before](evidence/b4/390/before-profile-share.png) | [After](evidence/b4/390/after-profile-share.png) | Same symbolic share presentation; actual featured choices. |
| Achievements | [Before](evidence/b4/390/before-profile-achievements.png) | [After](evidence/b4/390/after-profile-achievements.png) | Same cards/filter rail, server-provided availability/progress. |
| Achievement detail | [Before](evidence/b4/390/before-profile-detail.png) | [After](evidence/b4/390/after-profile-detail.png) | Same detail sheet; actual progress/reward, no invented active days. |
| Collection | [Before](evidence/b4/390/before-profile-collection.png) | [After](evidence/b4/390/after-profile-collection.png) | Same item presentation and categories; confirmed entitlements. |
| Arena locked Warfront | [Before](evidence/b4/390/before-arena-warfront.png) | [After](evidence/b4/390/after-arena-warfront.png) | Approved locked Season 2 presentation preserved. |
| Player rankings | [Before](evidence/b4/390/before-arena-players.png) | [After](evidence/b4/390/after-arena-players.png) | Same podium/list; real current-season ranks, scores and standing. |
| Clan rankings | [Before](evidence/b4/390/before-arena-clans.png) | [After](evidence/b4/390/after-arena-clans.png) | Same podium/list; real clans; no demo clan membership. |
| Notification Center | [Before](evidence/b4/390/before-notifications.png) | [After](evidence/b4/390/after-notifications.png) | Same panel/item/header. Underlying ranking data differs; no second center. |
| Confirmed reward | [Before](evidence/b4/390/before-reward-settlement.png) | [After](evidence/b4/390/after-reward-settlement.png) | Restored existing RewardReveal; exact confirmed XP replaces raw success copy. |
| Session Recovery | [Before](evidence/b4/390/before-session-recovery.png) | [After](evidence/b4/390/after-session-recovery.png) | Only 12px horizontal gap between the existing adjacent buttons. |

[Existing LevelUpReveal after confirmed Daily settlement](evidence/b4/390/after-level-reveal.png). It follows RewardReveal and uses server-confirmed progression. No new reward overlay was created.

The only new stylesheet is the owner-approved minimal transient feedback position layer using existing Notification Center classes/tokens. The only existing stylesheet addition contains ranking photos inside the existing avatar well (two rules); it changes no dimensions, spacing, typography, colors, motion or fallback appearance. Session Recovery changes one inline spacing property and no recovery code.

## Executed validation before final backend synchronization

- `npm run check`: structure/assets/imports/motion, production policy, unchanged B2/B3 source pins, semantic TypeScript, 216 units, production build and bundle exclusion passed.
- ESLint 9 + TypeScript parser (isolated tooling, changed production TS/TSX): correctness rules passed; existing repository lint validators also passed.
- Original `npm run test:e2e -- --workers=2`: 134/134 mobile/desktop scenarios passed.
- `npm run test:e2e:b4`: 17/17 browser/visual scenarios passed, including pre-edit screenshot comparisons and all three mobile Recovery spacings.
- Original B3 compatibility pairing at unchanged `c3f8f27`: 29/29 actual PostgreSQL API/controller tests and 13/13 production browser tests passed. Updated browser expectations dismiss the original reward overlays and claim Typing only on the Earn dashboard. Backend consent API compatibility tests remain, while removed consent UI tests are replaced with absence/automatic-refresh proof.
- Original B2 pairing at unchanged `34328c7`: 15/15 actual PostgreSQL API/controller tests and 6/6 production browser tests passed.

Additional tests against the existing implemented Profile/Arena APIs passed: 3/3 using actual PostgreSQL and Redis, including cross-credential customization, rejection/isolation, server tie ordering, own standing and pagination. CI runs these in addition to the unchanged B3 compatibility suite. This is not a final B4 backend pin.

Published B4 receipts, private images, notification navigation/read-all, typed archives and DLX are integrated at the separate exact B4 pin. Its final local paired PostgreSQL/Redis gate passes 9 API/controller checks and 16 production browser cases, including real current-period history and exact rollover/stale-cursor rejection. Local B4 browser/visual gates pass 17 cases. Final exact-head CI is recorded in the PR before owner handoff. Archive selection and visible DLX allocation are intentionally deferred by owner decision and do not block approved current-season rankings. No merge or deployment.

Additional mobile captures at every width show [referral image](evidence/b4/390/after-referral-private-image.png), [group image](evidence/b4/390/after-group-private-image.png) and [the approved minimal transient error over the existing Profile sheet](evidence/b4/390/after-transient-error.png). Images are synthetic test assets, not user images. Browser checks prove both successful delivery and initials fallback for each avatar type.

[Machine-readable local verification](evidence/b4/verification.json). Full route/endpoint behavior, exact pins and independent-review limitations are in [B4_FRONTEND_REPORT.md](B4_FRONTEND_REPORT.md).

Completed-state proof at all widths: [Mission before](evidence/b4/390/before-mission-completed.png) / [Mission after](evidence/b4/390/after-mission-completed.png) show the preserved card/action with one Completed label. [Claimed Daily](evidence/b4/390/after-daily-completed.png) shows the owner-selected checkmark-circle-02 and Claimed today heading/action after the original reward overlays close.

## Owner-selected Toast icon correction

Only the existing glyph mapping changes: Info `information-square` (`InformationSquareIcon`), Success `checkmark-square-02` (`CheckmarkSquare02Icon`), Error `cancel-square` (`CancelSquareIcon`), Warning `alert-02` (`Alert02Icon`). Installed declarations and runtime imports confirm all four exports. One non-interactive presenter reuses the same Notification Center classes, colors, spacing, safe areas, timing and motion. Warning shares the error live-region urgency; ordinary success/info use status. No new notification events, wording, controls or reward-success Toasts were introduced.

| Existing state | Previous approved layer | Owner correction | Evidence |
|---|---|---|---|
| Profile save error | Existing Toast above Customize; same concise error copy | Only Error glyph becomes `cancel-square` | [Previous 390px](https://github.com/hassan-anari/FROCAL/blob/83e7c00ab5ba98960cd487666323d3ff2ff9b80c/docs/evidence/b4/390/after-transient-error.png) / [Current 390px](evidence/b4/390/after-transient-error.png); also [320px](evidence/b4/320/after-transient-error.png), [460px](evidence/b4/460/after-transient-error.png), [glyph comparison](evidence/b4/owner-toast-comparison.json) |
| Network Add Bot | Existing Telegram picker, intent body `{}`, automatic server revalidation | No visible change; separate consent requirement withdrawn by owner; backend successor pending | Existing Network/Communities before/after captures and browser absence/revalidation assertions retained |
| Confirmed XP / level up | Original RewardReveal / LevelUpReveal | Unchanged; no Toast success for XP | Existing Daily/Mission/Typing and duplicate-reveal regression cases |
