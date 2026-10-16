# B4 frontend/backend handoff — contract requirements

Frontend scope: P-08/P-09 plus owner-requested B3 restoration, one Draft PR. No merge/deploy.

Owner-confirmed merged WEDCAL main: `1fa937af4628a10cec384b711210755ff28a6a8a`.
Existing B3 compatibility pin remains **`c3f8f27d18fda66b62e22c6cadd1480e1f0f4370`** unchanged.
The relevant merged Profile/Arena/notifications/Typing/referral/network API/schema blobs match that B3 pin. They were inspected through the GitHub connector. Published B4 runtime source/fixture pin: **`9a43048079bfc20bc5a030a88f84216c9451e4a8`**, separate from historical B3. Runtime schemas and fixtures are copied byte-for-byte with Git blob hashes in `scripts/contracts/b4-pin.json`. Current-period Typing history evidence is requested from the backend before final synchronization.

## Existing implemented contracts being reused

- `GET /profile/overview`, `/profile/achievements`, `/profile/collection`, `PUT /profile/customization`, `POST /profile/review`: catalog keys already match the approved frontend. Existing sheets/actions wait for confirmed writes, reconcile uncertain responses and use authenticated player/season/config cache scope. No client unlocks or achievement reward calculations.
- `GET /notifications?cursor=&limit=`, `POST /notifications/{public_uuid}/read`: reuse the sole Notification Center, paginate the existing list, keep confirmed read state.
- Ranking `player_id` is the internal Player primary key; authenticated/canonical player scope uses Telegram user ID. Do not equate those identifiers. Own standing is server-selected.
- `GET /arena/rankings/players`, `/arena/rankings/clans` with offset/limit and own_standing: existing podium/list/self-row, server ranks/tie ordering and scroll continuation. No client re-ranking.
- `GET /arena/state`: Season 2 Warfront remains locked; no Season 2 gameplay integration.
- `GET /arena/dlx`: confirmed off-chain allocation, no claim/transfer/price action. There is no approved visible allocation component; owner decision pending.
- Existing B3 Daily/Mission/Typing claim responses provide `created`, exact amount, claimed period/time and canonical state. RewardReveal/LevelUpReveal run only after confirmed newly created settlement; duplicate/reconciliation responses never reveal or credit locally.

All paths use `/api/v1`. Existing B3 pin/fixtures must remain intact for compatibility tests.

## B4 contract synchronization

| Requirement | Needed authoritative information / acceptance |
|---|---|
| Typing History | Authenticated actual run list; stable run identity, completion time, WPM, accuracy and exact value for the approved score column. Backend owns status/scoring/day selection/pagination. Include empty, real-history, failed/expired/incomplete and duplicate submission fixtures. Never infer runs from aggregate count/best. |
| Invited-player images | Published `photo_url` now binds the existing avatar/fallback, including start-only invitees. No Telegram file ID/client-built path or unrelated current-user photo. |
| Connected-group images | Published `photo_url` binds existing group avatars/fallback. GET schedules bounded verification; navigation/focus/resume refreshes actual state. No broadcast or manual verification mutation is exposed in this Mini App. |
| Archived seasons/rankings | Explicit current/archive season contract, season identity and correct ranking query scope; frozen/settled accounting. Owner must approve archive-selection UI mapping before adding controls. |
| Notification navigation | Published `deep_link.path` selects existing internal routes only. Payload URLs are ignored. Real `unread_count` and actor-scoped `/notifications/read-all` bind existing controls; private bot notifications stay excluded. |
| First Verified Activity | Current response has one progress/target pair; existing detail also supports active-day evidence. Supply actual secondary progress if approved, otherwise do not fabricate days. |
| Coherence | Canonical projection after Profile reconciliation if it can award points; player/config/season isolation; scope and progression revalidation across devices/navigation/resume. |

## Paired gate

Publish exact B4 implementation SHA, generated OpenAPI/fixtures, migration requirements and deterministic local test harness dependencies. The frontend will add a separate B4 source/fixture pin (not overwrite B3), synchronize CI checkout, and exercise the existing original paired B2/B3 regressions alongside B4 controller/browser tests against isolated PostgreSQL. No shared/live reward requests or production data reset.

## UI decisions remain owner-owned

Owner explicitly confirmed that archive selection and visible DLX allocation are deferred pending design approval and do not block completing current-season rankings. Do not repurpose Season 2 War History or the seasonal reward capsule. No archive selector, DLX card, extra empty state, status banner or action is invented. The before/after preservation matrix is [B4_UI_PRESERVATION.md](B4_UI_PRESERVATION.md). Minimal transient feedback was explicitly approved in chat after confirming no existing presenter; it reuses the Notification Center item styling and motion tokens, has no controls/history, and never shows reward success.
