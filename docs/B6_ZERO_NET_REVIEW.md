# B6 independent review: zero-net activity

The reviewed frontend head was `a0c0d4802b4554320b6f225a1b07eff51b82d4a5`. A valid server settlement with Player points 0 and Treasury credit 1 previously rendered “Verified earned 0 points”. It now renders **“Verified contributed to the Clan Treasury”**. Positive Player points retain the existing earned-points title. Missing Player amounts, missing/wrong units, negative amounts or inconsistent supplied optional amounts use “Clan activity settled”. Absent optional Treasury/Contribution fields do not hide a confirmed positive Player reward.

The description preserves each available nonnegative integer Treasury and Contribution amount separately, including zero. No split, balance, fraction, rank or cross-unit total is calculated. The sole production change is in `clanActivity.ts`; the card, styles, Query lifecycle, source timestamps, stable IDs, pagination, privacy and retries are unchanged.

## Exact backend and fixture provenance

The backend still publishes checkout **`28a6b8805db5f9a8c70b78c5eadf5c6276dbccd1`**, runtime/schema **`13e7b1988181980b6ad80b69a8e9f28347e31802`**. No successor final handoff was published when this correction was implemented. The checkout pin, verbatim OpenAPI, generated schemas, migrations and backend source remain unchanged. Backend PR #31's separate mission lifecycle review and final paired acceptance remain dependencies; this frontend correction does not approve that review.

[`zero-net-activity-http.json`](evidence/b6-zero-net/zero-net-activity-http.json) is an unmodified authenticated `/api/v1/clans/activity` response captured from the exact pinned backend in an isolated PostgreSQL/Redis paired run. The existing source control invokes the real `settle_clan_reward` service twice in a fresh synthetic Clan (gross 9, then gross 1). The backend returns gross 1, Player 0, Treasury 1 and contribution 1 for the rollover. The frontend asserts those canonical values rather than deriving the split. The paired test also checks replay, canonical Treasury/Home balances and one stable activity ID. This frontend-owned evidence sample is separate from the immutable published backend contract fixtures.

Every paired run regenerates a fresh response in `work/b6-paired/zero-net-activity-http.json`; actual mobile responses/screenshots are retained under `work/b6-paired/mobile/{320,390,460}` and in the CI B6 artifact. No Telegram credential or invite URL is included. These are isolated synthetic users and economics, with no live transactions or sends.

## Rendered and visual regression

The component tests verify both mapping and actual rendered titles/descriptions for positive Player/zero Treasury, positive Player/positive Treasury, zero Player/positive Treasury, optional/missing/null amounts and inconsistent values. All six other activity types retain their rendered copy. Source timestamps and stable IDs are checked. A separate test parses and renders the actual paired rollover sample.

The browser tests replay that same real HTTP response against immutable reviewed head `a0c0d48…` and the corrected implementation, at 320, 390 and 460px. They assert actual zero-net and positive-reward text, descriptions, original timestamps, unique IDs, no overflow and identical card width, grid columns, gaps, padding, fonts and colors. The longer approved title may wrap naturally; no layout or typography change is introduced. Actual-backend mobile tests independently create the rollover after HQ entry and confirm the row and canonical balance appear through background focus refresh.

| Width | Reviewed head | Corrected copy |
| --- | --- | --- |
| 320px | [Before](evidence/b6-zero-net/320/before-recent-activity.png) | [After](evidence/b6-zero-net/320/after-recent-activity.png) |
| 390px | [Before](evidence/b6-zero-net/390/before-recent-activity.png) | [After](evidence/b6-zero-net/390/after-recent-activity.png) |
| 460px | [Before](evidence/b6-zero-net/460/before-recent-activity.png) | [After](evidence/b6-zero-net/460/after-recent-activity.png) |

See [baseline provenance](evidence/b6-zero-net/baseline-provenance.json), per-width before-geometry files and [source/fixture/screenshot hashes and pixel measurements](evidence/b6-zero-net/validation-manifest.json). The broader [B6 visual report](B6_VISUAL_REPORT.md) retains the immutable-main preservation evidence. Exact final-head CI results and SHAs are recorded in [Draft PR #9](https://github.com/hassan-anari/FROCAL/pull/9).

PR #9 remains Draft until backend review and final paired acceptance are complete. No merge, deployment or new phase is authorized.
