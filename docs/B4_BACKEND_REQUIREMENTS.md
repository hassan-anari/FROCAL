# B4 frontend/backend handoff — contract requirements

Frontend scope: P-08/P-09 plus owner-requested B3 restoration, one Draft PR. No merge/deploy.

Owner-confirmed merged WEDCAL main: `1fa937af4628a10cec384b711210755ff28a6a8a`.
Existing B3 compatibility pin remains **`c3f8f27d18fda66b62e22c6cadd1480e1f0f4370`** unchanged.
The relevant merged Profile/Arena/notifications/Typing/referral/network API/schema blobs match that B3 pin. They were inspected through the GitHub connector. Published final B4 review/source/schema/fixture pin: **`75992805c1df2235a7513ddd6aa5864df65dd5c3`**, separate from historical B3. Runtime schemas and fixtures are copied byte-for-byte with Git blob hashes in `scripts/contracts/b4-pin.json`. Authoritative current-period Typing evidence is published and bound; no client reset-policy calculation is used.

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
| Typing History | `GET /typing/history?period=current` returns actual submitted runs, `period_key/start/end` and persisted run `reset_period`. Existing TODAY rows use server WPM/accuracy/nullable score, separately from reward credit. `TYPING_PERIOD_CHANGED` clears stale pages and reloads page one; a one-shot server-boundary timer and navigation/focus revalidate. No local date/score/credit derivation or invented runs. |
| Invited-player images | Published `photo_url` now binds the existing avatar/fallback, including start-only invitees. No Telegram file ID/client-built path or unrelated current-user photo. |
| Connected-group images | Published `photo_url` binds existing group avatars/fallback. GET schedules bounded verification; navigation/focus/resume refreshes actual state. No broadcast or manual verification mutation is exposed in this Mini App. |
| Archived seasons/rankings | Explicit current/archive season contract, season identity and correct ranking query scope; frozen/settled accounting. Owner must approve archive-selection UI mapping before adding controls. |
| Notification navigation | Published `deep_link.path` selects existing internal routes only. Payload URLs are ignored. Real `unread_count` and actor-scoped `/notifications/read-all` bind existing controls; private bot notifications stay excluded. |
| First Verified Activity | Current response has one progress/target pair; existing detail also supports active-day evidence. Supply actual secondary progress if approved, otherwise do not fabricate days. |
| Coherence | Canonical projection after Profile reconciliation if it can award points; player/config/season isolation; scope and progression revalidation across devices/navigation/resume. |

## Paired gate

`npm run validate:contracts` verifies separate B2/B3/B4 Git blobs. `npm run test:paired:b4` requires the exact B4 checkout, isolated local PostgreSQL (guarded `frocal_b3_` database prefix) and Redis database 15. It applies the pinned migrations only to that isolated database and exercises the actual APIs and production browser release. CI checks out the exact B4 SHA separately from historical B2/B3 jobs. The paired B4 gate passes 9 API/controller checks and 16 browser cases. Backend contract/rollout instructions are preserved in `scripts/contracts/b4/source/docs/B4_BACKEND_HANDOFF.md`. No shared/live reward requests, real Telegram sends or production data reset.

## UI decisions remain owner-owned

Owner explicitly confirmed that archive selection and visible DLX allocation are deferred pending design approval and do not block completing current-season rankings. Do not repurpose Season 2 War History or the seasonal reward capsule. No archive selector, DLX card, extra empty state, status banner or action is invented. The before/after preservation matrix is [B4_UI_PRESERVATION.md](B4_UI_PRESERVATION.md). Minimal transient feedback was explicitly approved in chat after confirming no existing presenter; it reuses the Notification Center item styling and motion tokens, has no controls/history, and never shows reward success.

## Owner policy correction — separate broadcast consent withdrawn

The owner explicitly removed the separate group consent/opt-in requirement. WEDCAL #29 owns the new Telegram membership/send-permission eligibility policy, including existing observed groups and dispatch-time revalidation. The frontend preserves the existing Add Bot picker and POST `/network/groups/intents` body `{}`; it adds no authorization flag, control, dialog or explanatory panel. Earlier interpretations requiring separate Mini App consent are superseded.

Final review/source/schema/fixture pin **`75992805c1df2235a7513ddd6aa5864df65dd5c3`** is published and synchronized, including `broadcast-policy.json`, updated OpenAPI and migration/rollout handoff. Runtime implementation is `3fd6d87a1d738b8ba78d98788c76b81cb1dc7715`; the review pin additionally retains the corrected persisted campaign fixture and migration regression. The separate B4 pin and CI checkout both use the final review HEAD. Historical B2/B3 compatibility pins/snapshots remain unchanged. The real browser regression verifies the existing empty intent payload and no consent-endpoint requests; legacy response fields are compatibility metadata only. The fixture/snapshot blob gate and paired PostgreSQL/Redis API/browser gate run against this exact successor. No frontend broadcast operation or new UI is introduced.
