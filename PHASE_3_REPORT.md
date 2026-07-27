# Phase 3 — Earn & Core Game Loop

## Scope completed

### Mission Control
- Rebuilt `/earn` as a playable game area rather than a static shell.
- Added Daily Core claim with once-per-day protection.
- Added seven-day streak visualization.
- Added Starter Protocol progress and level progression.
- Added three mission types: Daily Signal, Typing Protocol and Invite an Explorer.

### Daily Signal
- Interactive synchronization sheet.
- Animated connection core and node states.
- Mission completion followed by an explicit XP claim.

### Typing Protocol
- Dedicated route at `/earn/typing`.
- 30-second challenge.
- Character-by-character correctness feedback.
- Live accuracy and WPM.
- Pass/fail result flow.
- Best-result persistence.
- Successful completion unlocks a claimable mission reward.

### Referral
- Personal Telegram referral link.
- Copy and Telegram share actions.
- Verification-pending state.
- Hidden Diagnostics action for frontend testing until backend validation exists.
- Production referral completion remains intentionally pending the backend verification service.

### Rewards and progression
- Reward reveal overlay.
- Level Up overlay.
- Dexo evolution overlay at milestone levels.
- Persistent Level, Level XP and Lifetime XP.
- Earn progression now updates Base and the global game header.

### History
- Mission archive sheet.
- Daily, mission, typing, referral and level events.

### Diagnostics
- Earn reset.
- Referral verification.
- Starter-path completion.
- Near-evolution state.
- Direct Earn and Typing route access.

## Asset policy

No logo, background, Dexo, mission, reward or promotional artwork is bundled. All existing Asset Registry paths are preserved.

## Backend-ready contracts

Zod contracts were added for:

- Mission
- Mission status
- Typing result
- Earn history
- Earn progression

## Validation

The checkpoint includes:

- Structure validation
- Asset manifest validation
- Local import validation
- Earn store unit tests
- TypeScript syntax validation

## Checks completed in this environment

- Structure validation: passed
- Asset manifest validation: passed
- Local import validation: passed
- JSON validation: passed
- CSS structural validation: passed
- TypeScript/TSX syntax transpile: passed for 53 source and E2E files
- Asset exclusion policy: passed

A complete dependency install, strict project typecheck, Vitest run, Playwright run and Vite production build could not be executed in this environment because npm dependency installation timed out. Vercel will perform the actual dependency install and production build after the repository is pushed.
