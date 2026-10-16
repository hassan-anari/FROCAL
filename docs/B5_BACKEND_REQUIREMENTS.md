# B5 frontend API needs and resolved binding

One FROCAL Draft [PR #6](https://github.com/hassan-anari/FROCAL/pull/6); backend implementation belongs to WEDCAL Draft [PR #30](https://github.com/hassan-anari/WEDCAL/pull/30). Starting frontend main: `ef6f1fca4de541e6eb45c9b8bf3e114bbd163cfb`.

The planning-only backend commit `75a43e5e0aa7f0a17092218237da7c88b8996909` was never used as a runtime pin. The actual implementation, OpenAPI and PostgreSQL-generated HTTP fixtures are now pinned at **`af72edee1ea4ffb3fc6443f24dfa5fa1ab372518`** in `scripts/contracts/b5-pin.json`. Historical B2/B3/B4 pins remain unchanged.

## Owner-approved surfaces

The owner explicitly answered **“Approve reuse of existing ClanModal for these required states”** for request cancellation, accepted-invite/Telegram verification, leave confirmation, voting/removal, and recovery/dissolution. `ClanStatusSheet` now reuses that modal, footer/buttons, focus/scroll behavior and hierarchy. The existing Clan status action opens it. No further approval is pending for these surfaces. Backend-owned PH-045/PH-048 decisions below remain separate.

## Concrete frontend needs mapped to actual endpoints

All paths below are under authenticated `/api/v1`; Clan IDs and candidate IDs are internal server references, never client assertions about Telegram identity.

| Frontend need | Actual published API / rendering |
|---|---|
| Unlock and permanent seasonal role | GET `/clans/state`, POST `/clans/role`: server eligibility, configured Level 5 default, immutable CAPTAIN/SOLDIER, leave limits/cooldown |
| Known eligible groups and registration | GET `/clans/eligible-groups`, POST `/clans/eligible-groups/{id}/verify`, POST `/clans/`: verify fresh authority before selecting; registration rechecks it. No manual chat ID input |
| Discovery and preview | GET `/clans/?q=&offset=&limit=20`, GET `/clans/{id}`: server identity, count/capacity/HQ level/score. Unknown rank/match/freshness are not fabricated |
| Own request persistence and cancellation | GET `/clans/join-requests/current`, POST `/clans/{id}/join-requests`, DELETE `/clans/join-requests/{id}`: pending/declined/accepted/cancellation-pending survive refresh |
| Applicant review | GET `/clans/applicants`, POST `/clans/join-requests/{id}/decision`: actual request IDs, safe identity, level and Season Points. Unsupported statistics display a dash |
| Credential/access lifecycle | GET `/clans/invite/current`, GET `/clans/membership/current`: only the authenticated owner obtains an active credential; memory only; safe Telegram opener. Actual Telegram membership events/verification activate membership. Acceptance alone never activates local HQ |
| HQ and roster | GET `/clans/home`, GET `/clans/{id}`, GET `/clans/roster?offset=&limit=50`: exact HQ thresholds/progress/max state, roster membership IDs, Captain/Soldier access, own contribution. Roster continuation also supports removal-target selection |
| Treasury and equipment | GET `/clans/treasury`, GET `/clans/equipment`: exact ledger history, balance, prices, quantities, permissions, use limits, effects and server clock. POST `/clans/shop/{item}/purchase`, `/clans/inventory/{item}/activate` carry durable caller intent keys; no optimistic balances/rewards |
| Missions and trophies | GET `/clans/missions`, GET `/clans/trophies`: actual progress, participant payout state and earned amount, auto settlement, availability and unlocks. Static catalog is artwork/editorial mapping only |
| Leave and governance | POST `/clans/leave`, GET `/clans/governance`, POST `/clans/removal-cases`, `/clans/governance/{id}/vote`, `/clans/dissolution`: existing modal shows server consequences, electorate/quorum/deadline, immutable own vote and final result. Removal reasons follow the pinned service enum |
| Recovery and emergency | GET `/clans/recovery`, membership access/rejoin deadline, current invite: render actual recovery reason/start/admin deadline/integrity and available actions. Backend owns warnings, inactivity sweeps, revocation, deadlines and terminal transitions |
| Earn History and Base Recent Rewards | Existing GET `/rewards/history?limit=20&cursor=`: one authenticated scoped cache, real source/context/player XP/time, server continuation; no local ledger fabrication |
| Base objectives | Existing GET `/missions`: actual available title/status/reward, priority REWARD_READY → IN_PROGRESS → AVAILABLE, at most three |
| External banners | Existing GET `/content/banners/BASE`: declared TELEGRAM versus HTTPS type, arbitrary validated HTTPS host/query. Banner-specific strict validation; shared navigation policy retained |

## Deliberate server boundaries

- **PH-045:** same-season Captain recreation and detailed Captain authority-loss recovery triggers remain backend owner decisions. The frontend displays actual recovery/error state and respects `CLAN_OWNER_DECISION_REQUIRED`; it adds no succession, recreation or guessed timer.
- **PH-048:** `banner-raised` remains unavailable with null progress/target and no reward. The Trophy Hall renders that state instead of a simulated first milestone.
- Candidate member count/image, Arena rank, match percentage, applicant active days/medals/contribution forecast, and facility count are not all supplied by this contract. Unknown values remain absent/dashes; artwork/layout is preserved.
- Captain applicant inbox is the published pending-only list. The frontend does not invent an accepted-request management endpoint or infer another player's credential. Applicant cancellation covers accepted credential revocation; current credential state and cancellation-pending are server-authoritative.
- No API exists for user-driven mission settlement/claim: completion is automatic. Reads never trigger a simulated reward reveal or credit local XP.

## Paired acceptance

`npm run test:paired:b5-contract` verifies the exact checkout and all pinned bytes, runs the actual backend Clan suite (including governance, invite risk, economy and concurrency), validates freshly generated PostgreSQL HTTP responses, drives the real frontend API client against that backend, and runs Captain/Soldier browser scenarios. Only Telegram transport and isolated source/admin setup are controlled test boundaries; Clan API responses are not fabricated. Mobile screenshots include the reused status, invite, leave, removal, vote, recovery and dissolution surfaces.
