# FROCAL demo analytics

Frontend only. No WEDCAL change, backend endpoint, Vercel routing change, merge or deployment is part of this PR. Automatic Vercel deployment is disabled specifically for `feat/posthog-demo-clan-header` in the existing Git deployment policy.

## Configure the demo

1. Create/select a PostHog Cloud Free project in the owner's chosen region. In project settings, copy the **project token** and the **exact ingestion host**. The dashboard URL is not the ingestion host.
2. Set these build-time Vite variables on the intended frontend environment, then rebuild when rollout is approved:

   | Variable | Value |
   | --- | --- |
   | `VITE_POSTHOG_KEY` | Project token from PostHog; never a personal API key |
   | `VITE_POSTHOG_HOST` | Exact HTTPS ingestion origin from the project, without path/query/fragment |
   | `VITE_POSTHOG_ENABLED` | Optional; `false` disables everything; otherwise valid key/host enable the consent UI |
   | `VITE_POSTHOG_REPLAY_ENABLED` | Optional; `false` disables replay; otherwise testers can opt into it |

   `.env.example` explicitly leaves both switches off. Tokens are public browser configuration, not application authentication credentials. No production values are committed. Unconfigured, development, local/MSW fixture and unit-test environments never import or initialize the SDK.
3. In PostHog project privacy settings, enable **Discard IP data**. The client also replaces event IP with `0.0.0.0`, disables GeoIP enrichment, and strips event/person enrichment. The deprecated SDK `ip` option is not the privacy boundary. HTTP ingestion necessarily reaches PostHog over the tester's network connection.
4. Enable Session Replay in the project. Use 100% sampling for this small, consenting demo cohort, with no additional URL/flag/event start restriction and no minimum duration. The client overrides sampling only after replay consent. Monitor the project's current free event/replay allowances and set billing limits in PostHog; this frontend does not know the quota. Switch replay off and rebuild if the cohort would exceed it.
5. Keep project network-body/header, console, canvas and cross-origin iframe recording off. The frontend also disables these, filters network records/URLs and blocks private UI. Test ingestion/replay on the actual demo origin before inviting testers.

## Consent and identity

The compact prompt explains pseudonymous usage analytics and optional masked replay. Testers can choose analytics + replay, analytics only, or decline. **Demo privacy** reopens preferences and offers **Withdraw and stop tracking**. The versioned preference persists in localStorage, survives normal app cache releases, and synchronizes across tabs. If storage is unavailable the choice lasts only for that document. No opt-in means no SDK initialization or analytics requests. Withdrawal stops capture/replay, opts the SDK out and resets identity. Already transmitted data is not erased by withdrawal.

The exactly pinned SDK's public opt-out does not cancel all queued/retried sends. A small instance-specific transport guard also checks consent generation and hashed identity at both request/retry dispatch points; old-generation or old-player deliveries are dropped. Global fetch/XHR and application API traffic are untouched. The release browser test exercises a failed request followed by withdrawal. SDK upgrades must pass this test; an incompatible dispatch shape leaves analytics off. Already dispatched browser requests cannot be recalled.

Only a successful, schema-validated authenticated remote bootstrap in a Telegram launch can identify a player. `player.id` is currently the Telegram numeric ID. The client computes:

```text
frocal:player:v1: + hex(SHA-256(UTF-8("frocal:telegram-player:v1:" + verifiedTelegramId)))
```

The raw ID, names, usernames, photos, initData and API payloads are never passed to PostHog. This public deterministic namespace gives the same player the same identity across visits/devices. It is **pseudonymization, not anonymization or encryption**; a client cannot keep a secret salt. Authorized operators can derive a pseudonym locally from a verified ID when investigating a report. Do not upload a Telegram-to-pseudonym directory to PostHog.

Account/credential changes stop recording before the replacement identity is derived. Stale async initialization and previous-account mutation completions cannot identify or record the new account. SDK persistence is memory-only; reload starts a new built-in session, while the person identity remains stable. `identify()` omits anonymous aliases to avoid accumulating one alias per visit. No mock/placeholder/unverified identity is accepted.

## Data collected

`$pageview` uses fixed route paths and the `section` property: `base`, `earn`, `network`, `typing`, `clan`, `arena`, `profile`. Earn's persisted tabs are page views within `/earn`; the Typing challenge uses `/earn/typing`. Navigation and feature events are separate. Query strings, fragments, referrers, titles, campaign data and arbitrary event/person setters are stripped. SDK session/window IDs remain for person timelines and replay linkage.

| Event | Trigger |
| --- | --- |
| `daily_reward_claimed` | Server confirms a newly created Daily claim |
| `mission_claimed` | Server confirms a newly created mission claim |
| `typing_session_completed` | Server confirms a newly created VALID completed attempt; attempt ID used only for local deduplication |
| `network_group_registration_initiated` | Server returns the registration intent; does not mean the group is registered |
| `clan_registration_completed` | Successful registration response |
| `clan_join_request_submitted` | Successful join-request response; does not mean membership was accepted |
| `clan_status_opened` | Deliberately open the existing status sheet |
| `clan_shop_purchase_completed` / `clan_shop_activation_completed` | Successful non-replayed economic receipt |
| `earn_history_opened` | Deliberately open global Earn History |
| `arena_leaderboard_viewed` | Selected leaderboard has loaded; once per rendered view/mode, with `mode=players/clans` |

No tap, keystroke, typed text, mission destination, invite, item payload or auth properties are sent. Server receipt/attempt keys used to deduplicate remain memory-only. Duplicate responses and failed operations do not produce success events; repeated query renders and StrictMode do not produce extra page/leaderboard views.

PostHog owns sessions. `active_time` adds only `section` and `active_seconds`: at most one periodic event per minute, plus page/visibility/native activation transitions. It estimates visible foreground time until 30 seconds without local pointer/key/scroll activity. Hidden/native-inactive time is excluded. Local activity signals carry no input values and produce no individual analytics events. Treat this as a conservative estimate, not a reward, authoritative playtime or a replacement for SDK sessions.

Replay masks all text/inputs, redacts arbitrary attributes and URLs, and blocks images, hidden/file inputs, iframes, canvas and marked sensitive panels (including Clan Status/invites). Layout, public styles, navigation and interaction remain useful; personal text and artwork/photos are intentionally not visible. Raw launch URLs are replaced by fixed route URLs in replay metadata. Replay bytes are not committed to the repository.

## Dashboard after real events arrive

Create a **FROCAL consenting demo testers** dashboard. All results describe the opt-in population only.

1. **DAU / WAU**: Trends, `$pageview`, unique users, daily/weekly interval. Add a Lifecycle insight on the same event for new, returning, resurrected and dormant players.
2. **Sections**: Trends, `$pageview`, total events and unique users, breakdown by `section`. Table view, sort ascending/descending for least/most visited.
3. **Feature usage**: Trends for the custom events above, total events and unique users. Break leaderboard views down by `mode`.
4. **Active minutes**: Trends on `active_time`, sum of numeric property `active_seconds`, divided by 60. Break down by `section`; use a person breakdown/table for individual totals. An average event value is an average chunk, not average session duration. Keep PostHog's built-in session count/duration separate.
5. **Funnels**: `$pageview` with `section=earn` → `daily_reward_claimed`; `$pageview` with `section=clan` → `clan_join_request_submitted` or `clan_registration_completed`. Set a demo-appropriate conversion window.
6. **Retention**: first `$pageview` → returning `$pageview`, daily/weekly cohorts. For reward retention, use first/returning `daily_reward_claimed`.
7. **Individual activity/replay**: Persons → find pseudonymous distinct ID → event timeline and recordings. The same distinct ID and built-in `$session_id` connect events to replay. Use the Recordings list with a person filter for repeated visits/devices.

## Device acceptance before rollout

Use consenting synthetic/test accounts in Telegram Android and iOS, plus Desktop if used for the demo. Open through the real bot launch, accept replay and visit each section. Confirm a recording appears under the expected pseudonym, can be played, and has masked typing/form/name/invite/photo content. Background/resume the WebView, idle for more than 30 seconds, change account, reopen the app and confirm correct attribution and reasonable active time. Withdraw via Demo privacy, exercise features, and confirm no new capture/replay; reopen to verify the preference persists. Check free-plan usage and block/SDK-load failures on the real ingestion origin.

Automated tests use the production build, vendored official Telegram SDK, mobile Chromium and intercepted synthetic API/PostHog responses. They do not prove physical Telegram-device behavior or live PostHog Cloud playback. Those checks require the owner's configured project and a real tester device; no deployment or real analytics traffic is performed by this PR.
