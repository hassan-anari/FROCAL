# PostHog demo integration and Clan header alignment

Base: latest FROCAL main `20ffc4e6e7971c75ecfeaf57103ab161318c3542` (merged PR #10), rechecked before delivery. Branch: `feat/posthog-demo-clan-header`. Keep Draft, unmerged and undeployed.

## Result

- Official `posthog-js` 1.438.12, exactly pinned. Analytics/replay code loads after informed opt-in and verified authenticated bootstrap. No credentials, project identifiers or ingestion hosts are committed. Unconfigured, development, local/MSW and unit-test environments stay off.
- Deterministic versioned SHA-256 pseudonyms derived from authenticated Telegram `player.id`, followed by `identify()`. No raw ID/PII/person payloads. Cross-device identity, account/session changes and stale async responses are tested. SDK memory persistence plus disabled anonymous alias merging keeps repeat visits under the same person.
- Separate SPA page views for Base/Earn/Network/Typing/Clan/Arena/Profile and explicit feature events at confirmed success boundaries. No taps/keystrokes. Daily/mission/typing creation flags and shop replay flags prevent duplicate success events; receipts remain local. Native/visibility/idle-aware active-time estimates supplement built-in sessions.
- Persistent analytics-only/replay/decline choices, preference reopening and withdrawal. Replay masks text, inputs, attributes and launch URLs; sensitive panels/images are blocked. Console, bodies/headers, canvas and iframe recording default off. The SDK's queued/retry send paths are also fenced by consent generation and pseudonymous identity; SDK upgrades fail closed if that pinned adapter is incompatible.
- Clan status moves outside `.headerTop`, below the full-width name and beside the subtitle at the header's lower-right. Its native button copies Earn History's exact visual values and retains the existing left icon. All Captain/Soldier membership, registration and discovery states use the same structure; existing modal/permissions remain.
- `vercel.json` headers/rewrites are unchanged. Only this branch is added to the existing deployment-disable map, preventing an automatic review-branch deployment. No backend/WEDCAL change or API addition.

## Validation

| Check | Result |
| --- | --- |
| `npm run check` | 394 tests / 54 files; TypeScript, structure/assets/import/motion, production/routing policy, pinned contracts/schema drift, production build and bundle exclusions passed |
| Focused final Typing duplicate-response regression | 9 hook tests passed; duplicate VALID submissions do not emit success |
| `npm run validate:telegram-sdk` | Official vendored SDK hash/SRI passed |
| Production SDK/privacy/mobile browser suite | 7 passed; zero retries/skips; actual SDK capture, consent, failed-delivery retry withdrawal, decoded snapshot masking, reconstructed rrweb playback, account switching and second-device identity |
| Clan layout | 320/390/460px × 640px-high; Captain, long-name, Soldier, Captain registration and Soldier discovery; exact computed comparison to Earn History, no title overflow or header/button overlap; existing status sheet opens |
| Existing general frontend browser suite | All 136 scenarios validated: 130 initial passes; six artifact-write failures passed on an isolated rerun. A diagnostic run had cleared their shared output directory; no application assertion failed |
| Retained post-B6 browser cases | 15 passed, including History, Soldier leave, governance, equipment and Arena freshness |
| Routing comparison / diff hygiene | Headers/rewrites identical to main; `git diff --check` passed |

The test harness uses the actual release bundle and vendored Telegram SDK, synthetic authenticated API responses and a reserved intercepted ingestion origin. It removes only browser-automation bot signals so the real SDK can run; production bot filtering stays enabled. A visual fixture originally froze `Date.now()` but not `new Date()`, causing recursive SDK session rotation; replay tests restore a consistent real browser clock. SDK batching/envelope and binary-gzip replay payloads are decoded before checking sensitive sentinels. These harness corrections do not relax production capture restrictions.

The SDK and replay recorder remain separate lazy chunks (roughly 113KB and 70KB gzip respectively); neither is requested before consent. No network-body instrumentation, global fetch wrapper, custom session backend or extra analytics service was added. The existing application chunk-size warning remains.

## Review and setup

- [Required environment variables, project privacy/quota settings, dashboard insights and device acceptance](POSTHOG_DEMO_SETUP.md)
- [Mobile screenshots, reconstructed masked replay and provenance manifest](evidence/posthog-demo/README.md)

No PostHog project token/host was supplied, so no live analytics/replay was sent or Cloud project configured. Physical Telegram WebView and live Cloud playback/quota acceptance remain owner checks before rollout. The local replay reconstruction demonstrates usable masked layout and player attribution; it does not claim physical-device certification. No merge or deployment was performed.
