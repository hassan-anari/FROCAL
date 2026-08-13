# Phase 5 Clan Route Map

Main route:
- `/clan`

The route is intentionally state-driven rather than split into many URLs.

State flow:

`Level < 5`
→ Locked

`Level >= 5 + no role`
→ Permanent Captain/Soldier choice

`Soldier + no membership`
→ Discover / Search / Ranking
→ Clan Preview
→ One Join Request
→ Pending / Rejected
→ Accepted
→ Headquarters

`Captain + no clan`
→ Clan Founding
→ Headquarters

`Member / Captain Headquarters`
→ Home
→ Tasks
→ Members
→ Inventory

Captain-only:
→ Join Requests
→ Inventory Shop
