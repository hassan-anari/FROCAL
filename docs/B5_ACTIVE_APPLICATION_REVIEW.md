# B5 active-application review correction

Existing FROCAL Draft [PR #6](https://github.com/hassan-anari/FROCAL/pull/6), branch `ai/b5-clan-frontend`. Exact reviewed WEDCAL runtime: **`65a2c45810c0d5f721c662f3d4681967829ef242`**. The write-side and read-visibility blockers are resolved by this pin. Historical B2/B3/B4 pins are preserved. No merge, deployment, live Telegram send, redesign or B6.

## Authoritative selection and access

`selectClanApplications` examines the complete authenticated response before choosing any action. A path blocks when server metadata marks `blocks_new_application`, `credential_unresolved` or `is_active`. Safe terminal history cannot crowd out or replace a blocker. No frontend slice or array position determines the current application.

Exactly one blocking path is actionable only when `is_active`, `blocks_new_application`, `is_current_season` and `handling=CURRENT_SEASON` agree and its state is PENDING/ACCEPTED. Original `clan_season_id`, `season_id`, `season_code` and handling remain intact. An older-Season reservation or terminal-labelled unresolved credential becomes read-only operator-required status. Multiple blocking paths fail closed even when only one is PENDING/ACCEPTED. Contradictory metadata cannot grant an action.

The existing ClanModal, buttons and loading/error presentation are reused. Operator/ambiguous states expose Refresh status, without an invitation, cancellation target, new recovery privilege or invented resolution. An older reservation displays its original Season using the existing detail-list treatment; ordinary current-Season modal layout stays unchanged. Safe terminal history remains below active controls. Existing one-request wording, role permanence, eligibility, navigation, artwork and all CSS are preserved.

Credentials stay in disposable modal memory, outside Query/localStorage/sessionStorage, bound to authenticated scope, application/ClanSeason/Season identity and lifecycle handling. A late response cannot expose a stale credential after ambiguity or scope/state changes. Accepted current invitations remain accessible until actual verification or safe terminalization. Typed HTTP 409 CLAN_STATE_CONFLICT uses existing feedback and refreshes authoritative queries; it never replaces another application.

Actual membership reads own HQ activation. Activation and credential cleanup are distinct: an ACTIVATED record may still block while revocation is unresolved. Only the server's successful cleanup changes that metadata into safe history. Cancellation, operator proof and membership activation never release a reservation merely because the frontend clicked or observed a terminal label.

## Exact contract and fixture provenance

The separate B5 pin records reviewed Git blobs for actual backend source, OpenAPI, handoff and HTTP fixtures, including `single-application-http.json`, `request-history-isolation-http.json` and `request-visibility-http.json`. Frontend Zod models are regenerated from that OpenAPI; export/schema/blob drift checks pass. The paired runner requires the exact clean checkout, rejects an occupied stale harness port, generates fresh PostgreSQL HTTP fixtures, validates them separately and restores backend fixture files afterward.

The earlier owner-confirmed [read-contract blocker](https://github.com/hassan-anari/WEDCAL/pull/30#issuecomment-6227580941) is resolved: every global active/unsafe path is returned independently of the bounded safe-terminal history page, including older Seasons and legacy overlaps. No frontend workaround, guessed identity, cross-Season transfer or credential access is introduced.

## Validation and required final-head checks

- Frontend static/lint validators, TypeScript, production policy, contracts, release build/module exclusion and official Telegram SDK hash/SRI pass. **43 files / 293 unit tests**, including **33 focused selector/hook/typed-contract tests**; these counts overlap.
- Exact-pin PostgreSQL Clan suite: **267 passed**. This includes authenticated request visibility, cross-Season/terminal credential risk, 101 legacy active paths, authorization, governance/recovery, Treasury/equipment concurrency and idempotency.
- Real frontend client/API and fresh generated schema pairing: **19 passed**. Covers an older ACCEPTED request behind **26 newer terminal rows**, independent PENDING/ACCEPTED blocking, older-Season operator handling, terminal CANCELLED unresolved credentials, a current application plus an unresolved terminal credential, legacy overlapping applications, typed invite denial, explicit authorized resolution and actual subsequent eligibility. Activation asserts actual membership first, then actual worker cleanup before safe-history status.
- Actual mobile browser pairing: **13 passed**, including 320/390/460 Captain/Soldier flows, accepted access behind terminal history, failed/confirmed revocation, membership activation, cross-device conflict feedback, operator-required older/terminal records, mixed blockers and safe legacy overlaps. Operator proof in test setup invokes the actual permissioned backend service; the product exposes no new proof/control surface.
- **75 exact-pin screenshots**, including **24 targeted correction screenshots**, have hashes, source commits and viewport provenance in [the validation manifest](evidence/b5/validation-manifest.json) and [targeted manifest](evidence/b5/active-application-review/manifest.json). Approved-source before images remain unchanged. Authenticated URLs/credentials/traces and live Telegram sends are excluded.

The final published frontend SHA, complete paired-command result and exact hosted CI run are linked in Draft #6. All six final-head jobs are required: unit-build, browser, paired-b2, paired-b3, paired-b4 and paired-b5-contract. The broad browser job retains 134 app regressions, 17 B4 and 12 B5 browser/visual checks and immutable approved-source preservation guards. Previous green heads and intermediate deferred-CI commits do not replace these final checks.

## PH-048 and review boundary

The owner deferred `banner-raised` to Season 2 after the first officially confirmed Clan War victory, at most once per ClanSeason, per retained decision `b171fd9b5ecaa750288281e3ec7c5c09ba1a87c2`. The actual pin reports SEASON_2_DEFERRED, empty owner_decisions_pending, UNAVAILABLE/null progress/null target/no reward in Season 1. No Season 2 implementation is added.

No remaining contract blocker is known. Physical Telegram-device certification is not claimed by Chromium emulation. PR #6 remains Draft and unmerged for independent owner review after all final checks are green.
