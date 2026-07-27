# Phase 3.1 — Earn Center Tabs

Built on the approved Phase 2.6 shell and Phase 3.0 core loop.

## Earn architecture
The Earn area is now split into three permanent tabs:

1. **Earn** — Daily Core, season pathway, active missions and completed missions
2. **Network** — user referrals, group connections, referral tiers and network history
3. **Typing** — permanent Typing Arena dashboard with five daily plays

## Changes
- Removed the Level summary card from Earn.
- Moved shared stats to the bottom of the page.
- Added Referral and Active Group summary cards.
- Removed all signal-related language from Earn and Typing.
- Preserved the Daily Core claim flow.
- Added six sample missions, including website, X, Telegram, Typing Arena, profile and season brief actions.
- Split missions into Active and Completed sections.
- Added referral totals, verified referrals, referral XP, share controls and referral tiers.
- Added Telegram group connection flow and group metrics.
- Added a permanent Typing tab with daily attempts, best results and today history.
- Enforced a maximum of five Typing Arena plays per local day.
- Preserved the existing 30-second typing mechanic, accuracy threshold, WPM threshold and result calculation.
- Added Diagnostics controls for referrals, groups, mission completion and Earn reset.

## Mock referral tiers
- Bronze: 5 verified referrals
- Silver: 20 verified referrals
- Gold: 50 verified referrals

Thresholds and multipliers are UI configuration placeholders until backend rules are finalized.

## Persistence
Earn data now uses `dalexio-earn-state-v2` to prevent incompatible Phase 3.0 mock state from corrupting the new mission and network structure.

## Asset policy
No logo, background, Dexo, mission artwork or reward artwork is included. Existing registry paths remain repository-maintained.

## Validation performed
- Phase structure validation passed
- Asset manifest validation passed
- Local import validation passed
- TypeScript/TSX syntax transpile passed for 49 source files
- CSS brace validation passed
- Product asset exclusion verified; only the system fallback SVG is bundled

A full dependency install and Vite production build could not be completed in this environment because the npm registry request timed out. Vercel will perform the final dependency, typecheck and production build verification after deployment.
