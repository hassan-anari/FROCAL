# Demo analytics and Clan header evidence

Synthetic authenticated fixtures; production build and official vendored Telegram SDK. Screenshots use CSS widths 320/390/460 and a 640px-high viewport, device scale 1. No live accounts, credentials or raw replay payloads are published.

| Width | Earn reference | Captain | Long name | Soldier | Captain registration | Soldier discovery |
| --- | --- | --- | --- | --- | --- | --- |
| 320px | [History](320/earn-reference.png) | [Captain](320/clan-captain.png) | [Long name](320/clan-long-name.png) | [Soldier](320/clan-soldier.png) | [Registration](320/clan-captain-registration.png) | [Discovery](320/clan-soldier-discovery.png) |
| 390px | [History](390/earn-reference.png) | [Captain](390/clan-captain.png) | [Long name](390/clan-long-name.png) | [Soldier](390/clan-soldier.png) | [Registration](390/clan-captain-registration.png) | [Discovery](390/clan-soldier-discovery.png) |
| 460px | [History](460/earn-reference.png) | [Captain](460/clan-captain.png) | [Long name](460/clan-long-name.png) | [Soldier](460/clan-soldier.png) | [Registration](460/clan-captain-registration.png) | [Discovery](460/clan-soldier-discovery.png) |

The per-state geometry JSON verifies full-width wrapping titles, lower-right button alignment, no horizontal overflow and the same computed button design as Earn History (38px height, border, background, 13px radius, padding, font and gap). The existing status modal opens in each state.

[Initial consent](consent-prompt.png) · [Withdrawal preferences](consent-preferences.png) · [Reconstructed masked replay](masked-replay.png) · [Sanitized capture summary](safe-capture-summary.json) · [SHA-256 manifest](manifest.json)

The replay screenshot reconstructs the actual masked SDK snapshots with the SDK's official rrweb fork in an isolated test-only viewer. No viewer ships in the app. All recording events use the same pseudonym/session identity as the player's event timeline. Sentinels for launch data, personal text, typed/hidden inputs, invite URLs, private images and console content are absent from decoded capture.

Physical Telegram Android/iOS and live PostHog Cloud playback still require the owner's project configuration and real-device acceptance described in [setup](../../POSTHOG_DEMO_SETUP.md). Automated mobile Chromium is not device certification.
