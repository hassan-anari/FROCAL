# Phase 5 — Clan Frontend v5.0

## Scope
Frontend-only Clan implementation. Backend/business/economy rules remain mocked for later integration.

## Implemented states

### Level gate
- Clan locked below Level 5.
- Lock screen shows current level progress toward Level 5.

### Permanent path choice
At Level 5:
- Captain
- Soldier

Each path has a full explanation before confirmation.
No role-switch UI exists after confirmation.

### Soldier
Before membership:
- Discover
- Search
- Clan Leaderboard
- Suggested/newly-active clans
- Clan preview modal
- One active join request only
- Pending / Rejected states

After acceptance:
- Discovery/Search is replaced by Clan Headquarters.

### Captain
- Clan founding flow
- Name, Tag, Motto, visual tone
- Headquarters
- Join request inbox
- Accept / Reject mock actions
- Treasury Shop / Inventory purchasing

### Headquarters
- Clan identity
- Level + progress
- status/rank/leaderboard standing
- members
- member contribution
- Treasury
- achievements
- recent activity
- Tasks
- Inventory

### Tasks
Explicitly separated:
- Group Tasks
- Individual Tasks

Both have Active and Completed states.

### Inventory
Member:
- read-only purchased items

Captain:
- Inventory + Shop modes
- Treasury balance
- item price
- description
- effect/purpose
- mock purchase state

## Mobile/performance
- Mobile-first layouts.
- Primary motion uses transform + opacity only.
- No animated blur.
- Clan modals use the established viewport-fixed / scroll-lock / safe-area pattern.
- Background motion pauses while Clan overlays are open.

## Diagnostics
The hidden diagnostics page includes repeatable Clan scenarios:
- Locked L4
- Role choice L5
- Soldier discovery
- Soldier pending
- Soldier HQ
- Captain HQ
- accept/reject current Soldier request
