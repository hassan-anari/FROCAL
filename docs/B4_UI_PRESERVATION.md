# B4 UI preservation inventory and review gate

Baseline: FROCAL `ae91624` (merged B3). Approved visual references: Phase 3.2.2, Phase 3.3, Profile Phase 4.1.3/closure and Arena V2. Inventory recorded before page edits. Existing local scenarios are visual test fixtures only.

| Screen | Existing components/actions/overlays to reuse | Unauthorized B3 additions to remove | Authorized differences | Backend binding |
|---|---|---|---|---|
| Earn / Daily | Daily card, seven day nodes, one Claim control; RewardReveal then LevelUpReveal; existing pathway, summaries and dock | Global raw success/loading paragraphs, raw Streak/reset line, extra global Retry panel | Owner-selected Hugeicons checkmark-circle-02; isolated pending state | Daily settlement amount and canonical projection only |
| Earn / Missions | Active/completed lists, number/icon, reward footer, single action; same reward overlays | Duplicate Completed text, raw success paragraphs | One Completed action label; per-mission pending state | Published mission definitions and server verification/claim |
| Earn / Typing dashboard | Attempts, arena entry, dashboard Claim, best stats, mission, TODAY history rows | Raw reset date, reward-claimed paragraph | Existing rows await real backend history; no fabricated runs | Typing aggregate/claim already implemented; history API absent at B3 pin |
| Typing challenge | Back navigation, Dexo, 30-second timer, phrase/input, scoring/results, existing start/finish/retry | Detail-page Claim, raw reset timestamp, raw page feedback/extra error Retry | Shared transient failure presentation | Existing issued attempt, exact retry/submission and server result |
| Network / Referrals | Copy/share, guide sheet, tier rail/metrics, latest five rows, avatar/initials, pending/active status | None of the existing roster hierarchy | Navigation/focus/resume revalidation | Existing invitees support start-only attribution; private image field absent at B3 pin |
| Network / Communities | Group picker, guide, summary and existing group rows/status | Broadcast status/enable/revoke controls and consent overlay; manual Check status | Automatic revalidation; optional group image waits for actual URL contract | Existing registration/verification state and settled XP; image field absent |
| Profile Overview / Share | Identity/frame/title, compact Customize/Share, level bar, journey stats, showcase, symbolic share sheet | Production use of demo profile entitlements/customization | Existing save/equip/feature actions wait for server confirmation | Overview, achievements, collection, PUT customization; canonical lifetime progression |
| Profile Achievements / Collection / Customize | Existing filters, cards, detail sheet, locked Got it, frame/title/medal rails, live preview, Save profile | Demo unlocks/progress/rewards in authenticated views | Server entitlement/progress/reward values; existing locked artwork retained | Known catalog IDs map server keys; no new assets/design |
| Arena Warfront / Rankings | Locked S2 preview unchanged; Players/Clans toggle, podium/list/self-standing | Demo rankings/season figures in authenticated views | Existing rows bind actual current season; scroll loads server pages | Current rankings and DLX exist; archive API and archive selector absent |
| Header / Notification Center | Existing bell/unread count, drawer, item, Mark all read, close | None | Safe allowlisted internal destinations; scroll pagination; confirmed read state | Existing notifications cursor/read API |
| Session Recovery | Existing background/copy/buttons and switch confirmation | None | Only spacing between Try Again and Switch to This Device | No fencing/recovery logic changes |

## Known contract / owner decisions

The B3 backend pin is `c3f8f27d18fda66b62e22c6cadd1480e1f0f4370`. No B4 backend branch/handoff was discoverable at inventory time. Request an exact B4 pin before treating additive contracts as implemented.

- Backend must expose actual per-run Typing history and private invitee/group image URLs; do not construct URLs or infer runs from aggregate best/attempt counts.
- Archived rankings have no API or approved selection control. Owner must decide the existing UI mapping before adding any selector.
- Arena has no approved visible DLX allocation surface. Existing balance read may remain, but a new card/counter requires an owner decision.
- First Verified Activity has a secondary active-days presentation, while the current achievements response exposes one progress/target pair. Do not infer active days.

## Evidence and validation

Screenshots, before/after comparisons, executed checks and outstanding gates are recorded below before delivery. Chromium mobile emulation does not certify physical Telegram WebView performance.
