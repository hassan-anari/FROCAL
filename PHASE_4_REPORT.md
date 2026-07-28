# Phase 4 — Profile & Identity

## Scope delivered
Phase 4 replaces the Profile placeholder with a complete mobile-first identity experience:

- `Overview / Achievements / Collection` navigation
- Telegram first name, username and profile photo support
- Initial fallback avatar when Telegram has no photo
- Profile-only avatar frame and title plate rendering
- Level and XP progress
- Mission, streak, referral and lifetime-XP summary
- Wallet connection mock flow
- Dalexio account connection mock flow
- Customize Profile bottom sheet with live preview
- Featured medal and featured achievement slots
- Telegram Share Profile preview and share deep link
- Achievement filtering, progress states, locked states and detail sheets
- Frame, medal and title collection management
- Persistent profile choices through Zustand local storage
- Profile diagnostics controls

## Achievement rules represented
- **First Contribution:** first valid scoring contribution in Defense or War.
- **First Verified Activity:** 200 verified community messages across at least 5 active days. The default preview is 146/200 messages and 4/5 days.

## Collection rules
Visible frame collection:
- Standard
- Premium
- Seasonal
- Founder

Clan and Captain frames are registered but hidden until their gameplay systems exist.

The visible medal collection uses all six seasonal medals and four career medals. The second generic Season Champion medal is intentionally not shown to avoid a duplicate reward identity.

## Motion and mobile performance
All Phase 4 motion follows the Phase 3.3 mobile profile:
- transform and opacity only for transitions
- no animated blur
- no live backdrop-filter
- short tab and sheet transitions
- background motion pauses while a sheet is open
- assets load lazily outside the active preview

## State and backend boundary
Wallet and Dalexio account connections are frontend mock flows with `disconnected / connecting / connected / error` contracts. Real SDK and API integration remain backend/integration work.

## Asset policy
The 31 approved Profile assets are repository-maintained and are not bundled in checkpoint ZIPs. Their exact `/assets/profile/*.webp` paths remain registered in the manifest. Existing brand, world and Dexo artwork follows the same repository-maintained policy.

## Phase 4.1 polish
The Profile overlay system now renders at `document.body`, locks the game scroll container, covers the complete mobile viewport, respects safe areas, keeps modal actions visible and gives every detail state a close action. The title plate and symbolic Share Profile preview were also recomposed for a cleaner mobile identity layout.
