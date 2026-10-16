# B4 frontend/backend handoff — contract requirements

Frontend scope: P-08/P-09 plus owner-requested B3 restoration, one Draft PR. No merge/deploy.

Owner-confirmed merged WEDCAL main: `1fa937af4628a10cec384b711210755ff28a6a8a`.
Existing B3 compatibility pin remains **`c3f8f27d18fda66b62e22c6cadd1480e1f0f4370`** unchanged.
The relevant merged Profile/Arena/notifications/Typing/referral/network API/schema blobs match that B3 pin. They were inspected through the GitHub connector. A final B4 pin is **pending** the backend B4 agent's exact implementation SHA, contract and generated fixtures.

## Existing implemented contracts being reused

- `GET /profile/overview`, `/profile/achievements`, `/profile/collection`, `PUT /profile/customization`, `POST /profile/review`: catalog keys already match the approved frontend. Existing sheets/actions wait for confirmed writes, reconcile uncertain responses and use authenticated player/season/config cache scope. No client unlocks or achievement reward calculations.
- `GET /notifications?cursor=&limit=`, `POST /notifications/{public_uuid}/read`: reuse the sole Notification Center, paginate the existing list, keep confirmed read state.
- `GET /arena/rankings/players`, `/arena/rankings/clans` with offset/limit and own_standing: existing podium/list/self-row, server ranks/tie ordering and scroll continuation. No client re-ranking.
- `GET /arena/state`: Season 2 Warfront remains locked; no Season 2 gameplay integration.
- `GET /arena/dlx`: confirmed off-chain allocation, no claim/transfer/price action. There is no approved visible allocation component; owner decision pending.
- Existing B3 Daily/Mission/Typing claim responses provide `created`, exact amount, claimed period/time and canonical state. RewardReveal/LevelUpReveal run only after confirmed newly created settlement; duplicate/reconciliation responses never reveal or credit locally.

All paths use `/api/v1`. Existing B3 pin/fixtures must remain intact for compatibility tests.

## Backend additions required; do not guess frontend fields

| Requirement | Needed authoritative information / acceptance |
|---|---|
| Typing History | Authenticated actual run list; stable run identity, completion time, WPM, accuracy and exact value for the approved score column. Backend owns status/scoring/day selection/pagination. Include empty, real-history, failed/expired/incomplete and duplicate submission fixtures. Never infer runs from aggregate count/best. |
| Invited-player images | Backend-owned private delivery URL on actual invitees; stable identity if available; nullable image and start-only invitees. Existing avatar/fallback consumes URL as provided. No Telegram file ID/client-built path or unrelated current-user photo. |
| Connected-group images | Optional backend-owned private URL in group reads, actual registration/verification states. Existing avatar presentation only. No broadcast or manual verification mutation is exposed in this Mini App. |
| Archived seasons/rankings | Explicit current/archive season contract, season identity and correct ranking query scope; frozen/settled accounting. Owner must approve archive-selection UI mapping before adding controls. |
| Notification navigation | Exact documented payload destination field and legal route semantics. Only allowlisted existing internal game routes; reject scripts/protocol-relative/unknown routes. Private bot notifications remain excluded. No speculative payload key is consumed. |
| First Verified Activity | Current response has one progress/target pair; existing detail also supports active-day evidence. Supply actual secondary progress if approved, otherwise do not fabricate days. |
| Coherence | Canonical projection after Profile reconciliation if it can award points; player/config/season isolation; scope and progression revalidation across devices/navigation/resume. |

## Paired gate

Publish exact B4 implementation SHA, generated OpenAPI/fixtures, migration requirements and deterministic local test harness dependencies. The frontend will add a separate B4 source/fixture pin (not overwrite B3), synchronize CI checkout, and exercise the existing original paired B2/B3 regressions alongside B4 controller/browser tests against isolated PostgreSQL. No shared/live reward requests or production data reset.

## UI decisions remain owner-owned

No archive selector, DLX card, extra empty state, status banner or action is invented. The before/after preservation matrix is [B4_UI_PRESERVATION.md](B4_UI_PRESERVATION.md). Minimal transient feedback was explicitly approved in chat after confirming no existing presenter; it reuses the Notification Center item styling and motion tokens, has no controls/history, and never shows reward success.
