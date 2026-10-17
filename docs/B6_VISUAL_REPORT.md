# Batch 6 focused visual review

Baseline: immutable merged main **`f7324b07cda2ede8d55679457699ad376d03447d`**. Captures use the same installed Chromium, reduced motion and 320/390/460 × 844px viewports. No PR-head screenshot is accepted as its own baseline. [Baseline provenance](evidence/b6/baseline-provenance.json) and [source/screenshot hashes and comparisons](evidence/b6/validation-manifest.json).

**84 PNGs / 42 before-after pairs** cover Clan entry, Captain HQ and the isolated HQ scene, Status, background HQ error, empty candidates, registration, History loading/error/empty/filtering, and preserved Base/Profile/Arena. These are isolated browser diagnostics using existing B4/B5 contracts; actual PostgreSQL-backed Captain/Soldier acceptance is reported separately. No screenshot claims a published B6 feed/rank/streak/mission contract or physical Telegram-device certification.

## Measured authorized control changes

| Viewport | Status before | Status after | Registration before → after |
| --- | --- | --- | --- |
| 320px | 296.34 × 38px; no icon | 102.28 × 36px; Square Activity | 64.31 → 46px |
| 390px | 366.34 × 38px; no icon | 102.28 × 36px; Square Activity | 64.31 → 46px |
| 460px | 436.34 × 38px; no icon | 102.28 × 36px; Square Activity | 64.31 → 46px |

The Status right edge matches the existing header right edge at each width. Shared Button styles, header title typography, artwork and modal destination remain. Only the registration Button's local trailing container is reduced to fit the requested height.

## Preservation evidence

Base, Profile and Arena screenshots have **zero pixels changed** above the 10/255 channel comparison threshold at all three widths. The new browser gate also compares them directly against the immutable-main screenshots with a 0.2% maximum difference, without updating expected snapshots. Existing B4 guards remain.

HQ scene crop dimensions remain **298×471, 368×507 and 438×523px**. Its artwork, geometry and art-related CSS are unchanged. Raw crop differences are approximately **1.07%, 11.43%, 0.70%** at the respective widths. Manual inspection identifies edge/text/art raster differences after the header changes the scene's viewport position; these crops are not claimed as pixel-identical guards. The original before/after files are retained for independent inspection; no masks or newly blessed expected HQ image are used.

The intended visible differences are integrated animated/persistent read states, compact Status placement, 46px registration, understandable Status labels and the explicitly required Network/Speaker History scope. The existing card, scene, modal, avatar-fallback, navigation and reward/Season 2 visuals are retained.

## Review links

| Surface | 320px | 390px | 460px |
| --- | --- | --- | --- |
| Captain Groups Empty | [Before](evidence/b6/320/before-captain-groups-empty.png) · [After](evidence/b6/320/after-captain-groups-empty.png) | [Before](evidence/b6/390/before-captain-groups-empty.png) · [After](evidence/b6/390/after-captain-groups-empty.png) | [Before](evidence/b6/460/before-captain-groups-empty.png) · [After](evidence/b6/460/after-captain-groups-empty.png) |
| Captain Hq | [Before](evidence/b6/320/before-captain-hq.png) · [After](evidence/b6/320/after-captain-hq.png) | [Before](evidence/b6/390/before-captain-hq.png) · [After](evidence/b6/390/after-captain-hq.png) | [Before](evidence/b6/460/before-captain-hq.png) · [After](evidence/b6/460/after-captain-hq.png) |
| Captain Registration | [Before](evidence/b6/320/before-captain-registration.png) · [After](evidence/b6/320/after-captain-registration.png) | [Before](evidence/b6/390/before-captain-registration.png) · [After](evidence/b6/390/after-captain-registration.png) | [Before](evidence/b6/460/before-captain-registration.png) · [After](evidence/b6/460/after-captain-registration.png) |
| Clan Initial | [Before](evidence/b6/320/before-clan-initial.png) · [After](evidence/b6/320/after-clan-initial.png) | [Before](evidence/b6/390/before-clan-initial.png) · [After](evidence/b6/390/after-clan-initial.png) | [Before](evidence/b6/460/before-clan-initial.png) · [After](evidence/b6/460/after-clan-initial.png) |
| Clan Status | [Before](evidence/b6/320/before-clan-status.png) · [After](evidence/b6/320/after-clan-status.png) | [Before](evidence/b6/390/before-clan-status.png) · [After](evidence/b6/390/after-clan-status.png) | [Before](evidence/b6/460/before-clan-status.png) · [After](evidence/b6/460/after-clan-status.png) |
| History Empty | [Before](evidence/b6/320/before-history-empty.png) · [After](evidence/b6/320/after-history-empty.png) | [Before](evidence/b6/390/before-history-empty.png) · [After](evidence/b6/390/after-history-empty.png) | [Before](evidence/b6/460/before-history-empty.png) · [After](evidence/b6/460/after-history-empty.png) |
| History Error | [Before](evidence/b6/320/before-history-error.png) · [After](evidence/b6/320/after-history-error.png) | [Before](evidence/b6/390/before-history-error.png) · [After](evidence/b6/390/after-history-error.png) | [Before](evidence/b6/460/before-history-error.png) · [After](evidence/b6/460/after-history-error.png) |
| History Filtered | [Before](evidence/b6/320/before-history-filtered.png) · [After](evidence/b6/320/after-history-filtered.png) | [Before](evidence/b6/390/before-history-filtered.png) · [After](evidence/b6/390/after-history-filtered.png) | [Before](evidence/b6/460/before-history-filtered.png) · [After](evidence/b6/460/after-history-filtered.png) |
| History Loading | [Before](evidence/b6/320/before-history-loading.png) · [After](evidence/b6/320/after-history-loading.png) | [Before](evidence/b6/390/before-history-loading.png) · [After](evidence/b6/390/after-history-loading.png) | [Before](evidence/b6/460/before-history-loading.png) · [After](evidence/b6/460/after-history-loading.png) |
| Hq Refresh Error | [Before](evidence/b6/320/before-hq-refresh-error.png) · [After](evidence/b6/320/after-hq-refresh-error.png) | [Before](evidence/b6/390/before-hq-refresh-error.png) · [After](evidence/b6/390/after-hq-refresh-error.png) | [Before](evidence/b6/460/before-hq-refresh-error.png) · [After](evidence/b6/460/after-hq-refresh-error.png) |
| Hq Scene | [Before](evidence/b6/320/before-hq-scene.png) · [After](evidence/b6/320/after-hq-scene.png) | [Before](evidence/b6/390/before-hq-scene.png) · [After](evidence/b6/390/after-hq-scene.png) | [Before](evidence/b6/460/before-hq-scene.png) · [After](evidence/b6/460/after-hq-scene.png) |
| Preserved Arena | [Before](evidence/b6/320/before-preserved-arena.png) · [After](evidence/b6/320/after-preserved-arena.png) | [Before](evidence/b6/390/before-preserved-arena.png) · [After](evidence/b6/390/after-preserved-arena.png) | [Before](evidence/b6/460/before-preserved-arena.png) · [After](evidence/b6/460/after-preserved-arena.png) |
| Preserved Base | [Before](evidence/b6/320/before-preserved-base.png) · [After](evidence/b6/320/after-preserved-base.png) | [Before](evidence/b6/390/before-preserved-base.png) · [After](evidence/b6/390/after-preserved-base.png) | [Before](evidence/b6/460/before-preserved-base.png) · [After](evidence/b6/460/after-preserved-base.png) |
| Preserved Profile | [Before](evidence/b6/320/before-preserved-profile.png) · [After](evidence/b6/320/after-preserved-profile.png) | [Before](evidence/b6/390/before-preserved-profile.png) · [After](evidence/b6/390/after-preserved-profile.png) | [Before](evidence/b6/460/before-preserved-profile.png) · [After](evidence/b6/460/after-preserved-profile.png) |

Full-screen Clan captures naturally shift content after the compact header change. The async states keep accessible status announcements and real Retry buttons. The History sample intentionally contains CREATOR, NETWORK_SPEAKER and DAILY records: the corrected sheet shows only the first two; general/Base history remains available.
