# Phase 2.1 — Base Finalization

This checkpoint keeps the existing Phase 2 routes and focuses on completing the Base screen as one integrated fix pass.

## Header
- Kept the **Explorer** identity label.
- Centered the Season control and added the title **Neon Reign** beside `S1`.
- Aligned Level and Notification controls to the same height, radius and visual weight.
- Added a working Notification Center with four sample notifications, unread count, mark-as-read behavior, backdrop blur, animated top drawer and outside-click closing.

## Hidden diagnostics access
- Removed the visible Diagnostics button and component from Intro, Onboarding and all game pages.
- Diagnostics remains available through three rapid taps on the Season control inside the game shell.
- Added a Diagnostics control for showing or hiding the dynamic Critical Action card.

## Dexo card
- Merged `YOUR DEXO`, companion title, Level, Total XP and Growth Progress into the main Dexo card.
- Removed the separate progression card and `Say hello to Dexo` button.
- Replaced the permanent tap instruction with an optional Tip popover beside `DEXO ONLINE`.
- Preserved Dexo tap reactions, rotating dialogue, typewriter animation and timed return to the level character.

## Dynamic Base content
- Added the conditional `NEXT CRITICAL ACTION` card below Dexo.
- Rebuilt `NEXT OBJECTIVE` as a three-step progression timeline with percentage, progress bar, next unlock and milestone.
- Added `SINCE YOUR LAST VISIT` activity updates.
- Kept the existing Daily Streak, Season Score and Clan Status cards.

## Navigation and motion
- Removed text labels from the Bottom Navigation; icons remain accessible through ARIA labels and titles.
- Added direction-aware fade, blur and horizontal motion when switching game routes.
- Kept the Bottom Navigation visually stable while new page content enters.

## Design-system fix
- Updated primary gradient buttons to use separate padding-box and border-box layers.
- This prevents cyan/violet gradient bleeding at rounded horizontal edges.
- Applied the same correction to the existing Phase 2 primary preview buttons.

## Asset policy
- No logo, Dexo, platform or world artwork is bundled.
- Only `public/assets/system/missing-asset.svg` remains for development fallback.
- All product assets continue to resolve from the main repository through the existing manifest.

## Validation completed
- Structure validation: passed.
- Asset manifest validation: passed.
- Local import validation: passed.
- TypeScript syntax transpile: passed for 43 source files.
- CSS brace validation: passed.
- Full dependency installation and production build could not be completed in this environment because the npm install request timed out. Vercel remains the final dependency/build check.

## Next checkpoint
After Base approval, the next development target is **Earn / Core Game Loop**:

`Daily Claim → Missions → Typing Challenge → XP Reward → Level Up → Dexo Evolution → Streak → Referral → Mission History`
