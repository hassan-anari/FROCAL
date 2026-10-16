# B5 UI preservation matrix

Baseline: FROCAL merged `ef6f1fca4de541e6eb45c9b8bf3e114bbd163cfb`. `scripts/capture-b5-baseline.mjs` builds an immutable clean worktree at that commit. Browser fixtures are synthetic examples of existing B3/B4 APIs and the pre-existing RewardLedger history contract, not a B5 backend fixture handoff.

| Surface | Approved delta / preserved elements | Evidence and gate |
|---|---|---|
| Network Connected Communities photo | Remove initials gradient behind a real image, scoped `.groupAvatar:has(> img)` only. Actual before computed border=0, shadow=none; gradient remained behind rounded clipping. Keep 38px / 34px at 320, 13px corners, crop, content, failure handling, initials | `docs/evidence/b5/{320,390,460}/{before,after}-communities.png` and computed JSON. Unmodified NASA photo + missing/failing photo cases. |
| Group Expansion CTA | Only this CTA becomes 46px (before 64.3125px); trailing span 34px. Full width, gradient, label, arrow, rounding, action and shared Button unchanged | Before/after group-expansion screenshots and computed dimensions at 320/390/460. |
| Notification Center | Existing glyph content changes to visible flattened-list index `01`…; dimensions/tone/read/title/body/time/navigation remain | Before/after notifications at all widths; 22-row pagination and actual UUID read/navigation regression. Toast icons untouched. |
| Banner | No runtime/UI change needed: arbitrary external HTTPS already passes strict validation and opens through Telegram `openLink`; queries are preserved | Domain/query/malicious URL unit regressions plus browser external-link adapter regression. Existing B3 banner lifecycle tests retained. |
| Earn header / HistorySheet | Enable existing History button; existing sheet layout/transitions display actual source/context/confirmed signed player XP/timestamps, continuation and loading/empty/error text | Shared authenticated scoped query; browser pending, empty, error, pagination/partial-error and cache-sharing cases. Mobile after-earn-history.png. No extra control/modal. |
| Base Timeline | Up to three available real missions, priority reward-ready/in-progress/available; exact title/reward, state labels instead of invented progress. Solid turquoise/orange/gold numbered circles | Before/after base-objectives-rewards and after-base-confirmed-data at all widths; ordering/fewer rows/exclusion tests. Timeline geometry and All missions navigation retained. |
| Base Recent Rewards | Replace fictional last-visit feed in same card styling; up to three actual nonzero player XP ledger entries; hide when none | Same cache as Earn. Mobile real data shots and empty/error negative cases. No authoritative last-visit claim. |
| Clan art/cards/modals/HQ | No design change; historical local scenarios remain isolated; remote production gate closed until actual B5 binding | High-level feature flag and poisoned local-state negative case. Required new governance/credential/leave surfaces await owner decision in requirements doc. |
| Profile / Arena Warfront | No authorized visual delta | B5 before/after pixel gate at all widths (0.2% threshold); B4 full regression retained. |
| RewardReveal / LevelUpReveal / four Toast icons | No source/design change | Existing Earn reward and feedback browser/unit coverage retained. |
| B2/B3/B4 pins | No edits to historical source/fixture bytes or SHA pins | Existing blob drift checks and paired CI jobs retained. |

The older B4 whole-screen Base/Network screenshot comparison cannot certify B5's intentionally authorized changes. B4 retains its Profile/Warfront full-screen guards; B5 now owns the matching-baseline Base/Network evidence, exact CTA dimensions and narrow avatar correction. No new approved-looking baseline is auto-accepted from B5 head.
