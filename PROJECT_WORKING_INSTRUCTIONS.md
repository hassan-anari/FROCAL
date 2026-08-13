# Dalexio / Dexo Land — Working Instructions for Future Development

> **Snapshot:** 2026-08-08  
> This file records the user's working preferences and project-specific rules accumulated through development. Treat these as standing instructions unless the user gives a newer conflicting instruction.

---

## 1. Development workflow

1. **Do not code when the user says “فعلا کد نزن / don't code yet”.**
   - First restate exactly what was understood.
   - Wait for explicit approval such as “شروع کن / انجام بده”.

2. Major feature areas should be developed, then tested by the user in Telegram/Vercel, then fixed from screenshots/feedback. The real project loop is: `implement → package ZIP → GitHub → Vercel build → Telegram test bot on a real phone → screenshot/feedback → focused fix`.

3. **Do not over-fragment a major phase into lots of named sub-phases.**
   - The user explicitly said this is unnecessary.
   - Build the intended major phase, then respond to fixes directly.

4. Do not move to the next major product area until the user considers the current one finished.
   - Phase 3 is closed.
   - Phase 4 is currently active and not yet officially closed.

5. When the user gives a precise fix list, change only what is requested unless a technical dependency genuinely requires something else.

6. Do not reopen already approved screens just to make them match a new idea unless requested.

---

## 2. Mobile-first is mandatory

The product target is **Telegram on mobile**, not desktop.

- Design at ~390px first.
- Support roughly 320–460px.
- Desktop is only preview/debug.
- Do not use desktop smoothness as evidence that an animation is acceptable.
- Every important UI should be checked conceptually for short/narrow Telegram WebViews.
- Avoid layouts that only become correct at desktop width.

When a heading is intended to stay on one line:

- keep it `nowrap`
- use responsive/clamped font sizing
- avoid awkward single-word wrap on phones

---

## 3. Motion rules

The user likes the product to feel alive and animated. **Do not remove motion to solve performance. Optimize it.**

Permanent standard from Phase 3.3:

- primary animation: `transform` + `opacity`
- no live animated blur on route/tab/large surfaces
- avoid heavy `backdrop-filter`
- no animated `height: auto`
- short, premium movement rather than large travel
- pause background/ambient motion while modal is open
- pause animation when WebView is hidden
- persistent motion only on small isolated elements
- target stable 60 FPS in Telegram mobile WebView

Preferred timing:

- tap: 120–160ms
- tab: 180–220ms
- page: 220–260ms
- modal/sheet: 240–300ms

The Dexo lightweight vertical float is a good reference for smooth permanent animation.

Run `npm run validate:motion` on future changes.

---

## 4. Visual design rules

Keep the established design system:

- Inter
- deep navy / graphite
- cyan + violet
- controlled magenta
- gold only where intentionally special
- silver/white text
- Hugeicons stroke-rounded
- futuristic, polished, game-like

Avoid:

- ordinary SaaS dashboard visual language
- excessive nested cards
- unnecessary badges/boxes around every value
- decorative color borders around avatars unless specifically requested
- accidental gradient color artifacts in rounded button corners
- overusing gold to indicate normal active state

Primary gradient buttons should:

- have clean rounded corners
- clip all gradient layers correctly
- support the recurring subtle left-to-right sheen effect where used in the approved interaction language
- have a mobile press state

---

## 5. Header and navigation constraints

- Main header must remain simple.
- Do **not** place Profile Title Plate, Avatar Frames, medals or other profile cosmetics in the main global header.
- Those assets belong only to Profile / Customize / Share contexts.
- Bottom navigation remains icon-only.
- Hidden Diagnostics stays hidden; use triple-tap Season access.

---

## 6. Profile scope constraints

Profile is a player identity page, not a settings dashboard.

Do not add these unless explicitly requested later:

- verification center
- notification settings
- privacy settings
- language settings
- session/device management
- generic security settings
- logout/settings panel

Also:

- no Dexo Showcase in Profile
- keep Overview focused and not crowded
- include Wallet and Dalexio Account surfaces because the user explicitly requested them, but keep them `Coming soon` until real integrations exist; do not simulate Connect/Done states in the current Profile UI
- use Profile cosmetics only inside Profile-related flows

Current Profile structure:

`OVERVIEW | ACHIEVEMENTS | COLLECTION`

---

## 7. Modal / sheet rules

The previous Profile modal behavior was considered a root-level UX bug. Use the corrected v4.1 pattern.

For mobile modals/sheets:

- portal to `document.body` when transformed/scrolled route containers could interfere
- fixed to viewport
- backdrop covers entire viewport, including behind bottom nav
- respect top/bottom safe areas
- lock background scrolling
- restore exact previous scroll position after close
- only modal content scrolls
- keep header and action area visible
- background navigation should be inert
- every modal/detail state must have an obvious closing action
- use `Got it` for informational/locked/already-complete states
- actionable states can use Equip/Feature/etc.
- sticky/fixed action button must remain inside safe area
- buttons should use approved sheen and clean rounded gradient treatment
- Profile modal footer CTAs should stay compact in height with clearly readable text; avoid large trailing icon blocks that artificially increase button height
- do not use heavy live backdrop blur to create the effect

If a user opens a modal after scrolling far down the page, the modal must appear correctly **where they currently are**, not at document top.

---

## 8. Asset policy — critical

The user maintains approved artwork in the main repository.

Future ZIPs/source checkpoints must **not** re-bundle existing repository-maintained assets.

Never bundle unless the user explicitly changes this rule:

- brand logos
- main background
- Dexo artwork
- Dexo platform
- all 31 Profile assets supplied for Phase 4

Keep their exact paths in `src/assets/manifest.json`. Treat that manifest as the runtime canonical source for asset paths, with `ASSET_MAP_PHASE*.md` as the documentation reference. Do not invent/rename asset paths from memory when these files define them.

Checkpoint packages should generally include only:

- source code
- docs
- tests/config
- `public/assets/system/missing-asset.svg`

If a new asset is genuinely required:

- only include it if needed
- do not include it if the user says they will maintain it in the repository

Never replace the user's repository assets with newly generated approximations.

---

## 9. Product copy constraints

- Do not reintroduce Signal/trading language into Earn, Typing or future Dexo Land game copy. This rule does **not** authorize retroactive changes to already-approved Base copy; legacy Base wording is left alone unless the user explicitly asks to change it.
- Use game/community language: missions, exploration, progression, network, community, clans, defense, war, seasons, achievements.
- Keep copy concise enough for mobile.
- Supporting subtitles should be readable; do not make them tiny just to fit.

---

## 10. Referral/business rules to preserve

- Personal referral starts through the user's Telegram-linked referral link.
- Referral becomes successful after the invited user reaches at least Level 5.
- Only then should the referral be treated as active for revenue/reward sharing.
- More successful referrals raise tier/reward percentage.
- Current UI percentages: Bronze 5%, Silver 7%, Gold 10%.
- Exact backend thresholds/economics are not final; do not invent them.

Referral list UX should support:

- photo or initials fallback
- name
- level
- active/pending
- invite date
- activation progress for pending referrals

---

## 11. Group/creator business rules to preserve

This is for community owners/creators.

- Dalexio bot must be added to the Telegram group/community.
- Bot must be Admin for the group to qualify.
- Creator can earn/reward from valid community activity.
- Reward belongs to the registered creator account, not automatically to every other admin.
- Do not add an unnecessary large decorative house/icon block to this section.

Backend ownership/anti-abuse rules remain future work.

---

## 12. Typing Arena rules to preserve

- 30 seconds
- 85% minimum accuracy for pass
- 10 WPM minimum for pass
- maximum 5 completed runs/day
- ~20 game-world practice sentences
- no Signal terminology
- block normal copy/paste/selection/context menu as a casual anti-cheat measure
- real anti-cheat belongs on backend later

Dexo appears without the platform in Typing Arena and uses the approved lightweight float.

---

## 13. Achievement rules to preserve

`First Verified Activity`

- 200 verified messages
- at least 5 active days
- intended cap: max 50 counted messages/day
- backend must define what qualifies as verified/non-spam

`First Contribution`

- first **valid scoring contribution** in Defense or War
- merely entering the event does not count

Clan/War achievements can be shown as future/locked where appropriate but should not be falsely obtainable before those systems exist.

---

## 14. Profile asset usage rules

Current visible frames:

- Standard
- Premium
- Seasonal
- Founder

Reserved until Clan:

- Clan
- Captain

Title Plate:

- Profile only
- should feel integrated with name/identity, not pasted on

Share Frame:

- Profile Share context only
- current Share Preview is symbolic; do not imply real image export unless implemented

Achievement/Medal showcase slot assets:

- use in Customize/Collection where helpful
- do not turn Overview into a wall of large decorative frames

---

## 14.1 Mock values vs final business rules

Frontend mock/config numbers exist to make the current UX testable. Do not silently convert them into final backend economics.

Unless explicitly finalized by the user, treat these as provisional:

- XP/reward amounts
- level target formulas
- referral tier thresholds and percentages beyond the currently approved UI presentation
- referral/group reward examples
- sample counts/history
- season/rank figures
- wallet/account mock states
- token/allocation/claim figures

Preserve them for frontend continuity when needed, but ask for confirmation before implementing production economics.

## 15. Testing and build requirements

A previous checkpoint passed syntax transpilation but failed real Vercel TypeScript checking. Therefore:

- Do not call syntax-only transpilation “full TypeScript validation”.
- Prefer full `npm run typecheck` (`tsc -b`).
- Prefer full `npm run build`.
- Ideal: `npm run check`.
- If npm registry/network prevents dependency install locally, state that clearly and let Vercel be the final production build check.
- Still run all validators that can run locally.

Current validators:

- structure
- assets
- imports
- motion
- TypeScript
- unit tests
- production build
- Playwright as needed

---

## 16. Delivery format

When generating a new project checkpoint:

- give the user a working ZIP link
- give a concise change report
- optionally provide SHA-256
- use clickable sandbox links, not raw `/mnt/data/...` paths
- do not bury the download link in excessive explanation

Keep filenames versioned and clear.

---

## 17. Communication style for this project

- Be direct.
- Do not over-explain obvious implementation details unless they matter.
- When a mistake is yours, acknowledge it plainly and fix it.
- Do not argue with screenshots; use them as the actual UX evidence.
- Do not invent extra features after the user has deliberately simplified a screen.
- When asked “did you understand?”, summarize the exact requested changes and stop if the user said not to code.
- When the user approves, start implementation without asking the same questions again.

---

## 17.1 Approved / do-not-reopen rule

Without an explicit user request, do not broadly redesign or refactor:

- Phase 0 Intro/Foundation
- Phase 1 Onboarding
- Phase 2 Base/main shell
- Phase 3 Earn/Network/Typing
- Phase 3.3 mobile motion standard

Phases 0–4 are closed. Phase 5 Clan is the active QA phase until the user closes it. Narrow bug fixes may touch shared code only when necessary, while preserving approved visuals/behavior elsewhere.

## 18. Source-of-truth precedence

If instructions conflict, use this order:

1. The user's newest explicit instruction in the active chat.
2. `PROJECT_WORKING_INSTRUCTIONS.md`.
3. `PROJECT_STATUS_AND_ROADMAP.md`.
4. `PROJECT_PRODUCT_AND_BUSINESS_LOGIC.md`.
5. Existing source code/reports.

Do not let an older mock implementation override a newer product decision.

---

## 19. Current continuation rule

At this snapshot, do **not** jump beyond Clan or reopen earlier closed phases simply because later systems exist on the roadmap.

Phase 4.1.3 Profile is the accepted final Phase 4 checkpoint. Phase 4 is officially closed. It is based on v4.1.2 and additionally makes the two Profile header actions compact, removes the decorative Title Plate from Customize preview too, and fixes immediate Avatar Frame visual updates. Neither main Profile nor Customize live preview should render the Title Plate. The discarded v4.2 blur/rasterization experiment must not be treated as part of the baseline. Also remember that the 31 supplied Profile assets are now repository-maintained and must not be bundled again in future source ZIPs.

- Profile identity actions under the level bar should be compact-height mobile CTAs. A trailing icon container must never force the entire button taller than intended.

- Dynamic asset selectors (especially Avatar Frames) must visually update immediately when the asset key changes; never cache an initial asset path in a way that requires page/tab remounting.

- Phase 4 is closed. Do not redesign or reopen Profile unless the user explicitly requests a change.


## Clan implementation instructions

- The next frontend module is Clan, not standalone Inventory.
- Treat backend/business/economy logic as future integration work; use mock data/state for the frontend.
- Clan stays locked until Level 5.
- At Level 5 show a one-time permanent path choice: Captain or Soldier.
- Never add a role-switch/change-role control.
- Before confirmation, explain Captain responsibility and Soldier impact clearly.
- Soldier can have only one active join request; do not build multi-request UI.
- Before membership, Soldier UI includes Clan Leaderboard, Search and Suggested Clans.
- After acceptance into a clan, hide Discovery/Search and make Clan Headquarters the primary Clan experience.
- Separate `Group Tasks` and `Individual Tasks` visually and structurally.
- Regular members can view Clan Inventory but cannot spend Treasury.
- Captain can spend Treasury through a Shop-like Inventory UI.
- Reuse established mobile modal patterns for Clan item/achievement details.
- Keep all Clan design mobile-first and preserve the Phase 3.3 performance/motion rules.


## Phase 5 Clan QA instruction

Clan v5.0 is implemented. Until the user closes the phase:
- test/fix the current Clan implementation rather than redesigning closed Phase 0–4 screens
- keep all new Clan fixes mobile-first
- preserve one-time role choice
- preserve one-active-request Soldier rule
- preserve Group/Individual task separation
- preserve member read-only Inventory vs Captain Shop distinction
- do not add backend/economy complexity unless explicitly requested
