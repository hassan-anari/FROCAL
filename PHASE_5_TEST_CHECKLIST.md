# Phase 5 Clan — Mobile QA Checklist

Use the hidden diagnostics route (triple tap the Season label from the main header) to move between repeatable Clan scenarios.

## Locked
- Level 4 shows Clan locked.
- Progress clearly points to Level 5.
- No Captain/Soldier actions are available.

## Role choice
- Level 5 shows Captain and Soldier cards.
- Both explanations are readable on a narrow Telegram viewport.
- Confirmation modal states that the choice is permanent.
- No role-switch UI exists after confirmation.

## Soldier discovery
- Discover, Search and Ranking tabs animate smoothly.
- Suggested clans prioritize newly active clans.
- Search filters by name/tag.
- Leaderboard shows top clans and scores.
- Clan preview modal is safe-area aware and scroll locks the page behind it.
- Only one join request can be active at once.
- Pending and Rejected states are understandable.

## Captain founding
- Name, tag, motto and identity tone update the live preview.
- Found Clan enters Headquarters.

## Headquarters
- Clan level/progress, status, score, rank, Treasury and member capacity are visible.
- Home shows current objective, leaderboard standing, achievements and activity.
- Tasks separates Group Tasks and Individual Tasks.
- Active / Completed filtering works.
- Members show Level, role and contribution.
- Member Inventory is read-only.

## Captain-only
- Join Request inbox opens in a fixed safe-area modal.
- Accept/Reject state updates immediately.
- Inventory has Inventory / Shop modes.
- Shop item details show price, description and effect.
- Mock purchase reduces Treasury and immediately moves the item into Inventory.

## Performance
- Tab/page/modal transitions are smooth in Telegram mobile.
- No animated blur.
- Background motion pauses while a Clan modal is open.
