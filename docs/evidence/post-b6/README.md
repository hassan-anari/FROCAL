# Post-B6 review evidence

These captures accompany [Draft PR #10](https://github.com/hassan-anari/FROCAL/pull/10). [Manifest](manifest.json) records SHA-256 hashes, runtime source, immutable-main comparison, browser and viewport provenance. See the [report](../../POST_B6_HOTFIX_REPORT.md) for behavior and validation limits.

| Width | Before header | After header | Long title | Actual destructive confirmation | Actual vote | Actual blocked |
| --- | --- | --- | --- | --- | --- | --- |
| 320 | [Before](320/before-clan-header.png) | [After](320/after-clan-header.png) | [Title](320/after-clan-long-title.png) | [Warning](paired/320/immediate-armed.png) | [Vote](paired/320/vote-required.png) | [Blocked](paired/320/blocked-electorate.png) |
| 390 | [Before](390/before-clan-header.png) | [After](390/after-clan-header.png) | [Title](390/after-clan-long-title.png) | [Warning](paired/390/immediate-armed.png) | [Vote](paired/390/vote-required.png) | [Blocked](paired/390/blocked-electorate.png) |
| 460 | [Before](460/before-clan-header.png) | [After](460/after-clan-header.png) | [Title](460/after-clan-long-title.png) | [Warning](paired/460/immediate-armed.png) | [Vote](paired/460/vote-required.png) | [Blocked](paired/460/blocked-electorate.png) |

Each width also includes before/after equipment and protected Base/Profile/Arena captures, successful Soldier cooldown and a 640px-high dissolution confirmation. [Empty Inventory](390/facilities-empty.png), [owned Inventory](390/facilities-owned.png) and [preserved History](390/history-preserved.png) supplement those comparisons.

| Width | Reconciled live Arena | One-use registration | New Headquarters after reload |
| --- | --- | --- | --- |
| 320 | [Arena](paired/320/successor-live-rankings.png) | [Registration](paired/320/successor-qa-registration.png) | [Headquarters](paired/320/successor-qa-created.png) |
| 390 | [Arena](paired/390/successor-live-rankings.png) | [Registration](paired/390/successor-qa-registration.png) | [Headquarters](paired/390/successor-qa-created.png) |
| 460 | [Arena](paired/460/successor-live-rankings.png) | [Registration](paired/460/successor-qa-registration.png) | [Headquarters](paired/460/successor-qa-created.png) |

[Actual HTTP responses](paired/http-evidence.json) cover filtered pagination, unchanged Base rewards, all dissolution outcomes and meaningful/legacy notification presentation. They contain synthetic fixture identities, no invitation credentials or private QA account identifier.

[Ranking responses](paired/successor-rankings-http.json) verify removal, compact ranks, counts, page boundaries, null former-Captain standing, cold rebuild and immutable archived score. [Authorization responses](paired/successor-qa-http.json) show the default, explicitly authorized and consumed states; command replay cannot replenish the grant.

The actual-backend captures and final paired results use **7c09f8f7e715339ac98e68b7b001bfe724a25a61**: 374 backend, 31 HTTP/client and 36 browser tests passed locally. Source provenance and artifact hashes are in the manifest; hosted CI results are linked on Draft #10. No production operation or physical-device certification is claimed. The earlier 07876b3 baseline is retained in Git history and is not presented as final acceptance.


| Width | History button: official icon on left | Complete global reward ledger |
| --- | --- | --- |
| 320 | [Button](320/earn-history-button.png) | [History](320/global-history-mixed.png) |
| 390 | [Button](390/earn-history-button.png) | [History](390/global-history-mixed.png) |
| 460 | [Button](460/earn-history-button.png) | [History](460/global-history-mixed.png) |

Global History keeps mixed server sources, signed amounts and backend cursor order; the Network preview keeps its independent filtered query. [Actual successor ledger](paired/390/global-history-ledger.png) and [raw ledger pages/request parameters](paired/global-history-http.json) come from an additional focused passing browser test against the exact same successor. Final expanded-scope hosted acceptance is linked on PR #10.
