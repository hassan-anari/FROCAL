# Dalexio / Dexo Land — Product & Business Logic

> **Snapshot:** 2026-08-08  
> **Current frontend checkpoint:** Phase 4.1.1 (`4.1.1`)  
> **Primary runtime:** Telegram Mini App on mobile  
> **Purpose of this file:** product/business source-of-truth for continuing development in a new chat without reconstructing prior decisions.

---

## 1. What this project is

Dalexio is building a **mobile-first Telegram Mini App game layer called Dexo Land** around the Dalexio ecosystem / airdrop journey. The product should feel like a polished futuristic game, not a dashboard or ordinary website.

The core loop is designed to turn ecosystem participation into a visible player progression system:

**Enter Dexo Land → meet/acquire Dexo → complete missions and daily actions → gain XP → level up → evolve identity → grow a referral/community network → collect achievements/medals/cosmetics → later participate in Clan, Defense, War, seasonal competition and world events.**

The current frontend is intentionally mock/state-driven. Real backend validation, wallet SDK integration, Dalexio-account API integration, real reward economics, anti-cheat and final token/allocation logic are later integration work. **Frontend XP/reward/count/tier examples are test/mock values unless this document explicitly identifies them as an agreed business rule; they must not be treated as final tokenomics by default.**

Main Telegram bot deep link used by the product:

`https://t.me/DalexioBot?start=dexoairdrop`

Referral links extend this start parameter with the inviter identifier.

---

## 2. Product principles

### 2.1 Mobile-first means mobile-first

The actual product canvas is the Telegram mobile WebView.

- Target design width: ~390px.
- Supported working range: roughly 320–460px.
- Portrait orientation is the product target.
- Desktop/Vercel browser is only a centered mobile preview and debugging surface.
- Do **not** optimize visual decisions for desktop at the expense of mobile.
- Titles that are intended to be one line should remain one line on realistic mobile widths and scale responsively instead of wrapping awkwardly.

### 2.2 Game-first visual language

The interface should feel like a premium, futuristic game UI:

- Deep navy / graphite surfaces.
- Cyan and violet as primary energy accents.
- Magenta as a controlled secondary accent.
- Gold only where a feature is intentionally special; do not overuse it.
- Soft silver/white primary text.
- Inter Variable typography.
- Hugeicons Stroke Rounded (`@hugeicons/react`, `@hugeicons/core-free-icons`).
- 3D or high-quality illustrated assets may carry the visual identity, but the surrounding UI should remain clean and controlled.

The product should **not** become a conventional admin dashboard. Avoid adding settings or management sections simply because they are common in web apps.

---

## 3. Motion / performance business requirement

Phase 3.3 established a permanent product rule: **premium motion must remain, but it must be built for Telegram mobile WebViews.**

Primary animation is limited to compositor-friendly properties:

- `transform`
- `opacity`

Avoid for live animation:

- animated `filter: blur(...)`
- large live `backdrop-filter`
- animated `height: auto`
- long-distance page travel
- many large surfaces animating simultaneously
- permanent heavy glow/paint effects

Timing baseline:

- Tap response: 120–160ms
- Tab transition: 180–220ms
- Page transition: 220–260ms
- Sheet/drawer: 240–300ms
- Cinematic moment: up to ~760ms, only when genuinely justified

Persistent animations should be isolated and cheap. Ambient motion pauses when overlays are open or when the WebView becomes hidden.

The project has `npm run validate:motion` to prevent reintroducing known expensive patterns.

---

## 4. User entry and onboarding logic

### 4.1 Intro is always first

Every launch begins with the approved intro experience.

- Phase 0 intro is considered approved and closed.
- The final Phase 0 visual basis is v0.4; a later v0.5 direction was deprecated.
- `DEXO LAND` uses the approved wider horizontal letter spacing.

### 4.2 New user flow

`Intro → Onboarding → Dexo acquired → Base`

The onboarding introduces Dexo and the game identity before entering the main shell.

### 4.3 Returning user flow

`Intro → Base`

Do not force returning users through onboarding again.

### 4.4 Telegram identity

- Prefer the user's Telegram **first name**, not username, for greetings and friendly identity.
- Telegram username can appear where useful as secondary identity, e.g. Profile.
- Telegram photo is used when available; otherwise use a clean initials avatar fallback.

---

## 5. Dexo character behavior

Dexo is the companion/character identity of the game.

Approved behavior from the Base/onboarding work:

- Dexo has multiple poses/reaction assets.
- Tapping Dexo can trigger reactions.
- Dialogue appears above the character rather than covering the art.
- Dialogue uses a typewriter effect.
- Reaction copy rotates so the same line is not immediately repeated.
- After approximately 10 seconds Dexo returns to the level-appropriate character state.
- Dexo assets are preloaded early so reaction swapping is responsive.
- The permanent floating motion should remain lightweight and transform-based.

Evolution title mapping currently represented in the frontend mock:

- Level 5 → Explorer
- Level 10 → Connector
- Level 15 → Specialist
- Level 20 → Vanguard
- Level 30 → Legend

Current XP-level formula in the mock store:

- Level 1 target: 500 XP
- Later target: `500 + (level - 1) * 180`

This is frontend/mock progression until backend rules are finalized.

---

## 6. Main application shell

Main game routes currently exist for:

- `/base`
- `/earn`
- `/earn/typing`
- `/clan`
- `/arena`
- `/profile`
- hidden `/diagnostics`

Main bottom navigation is icon-only. Labels remain available through accessibility metadata but are not visibly stacked under icons.

The main header is intentionally simple and must stay that way. Profile frames, title plates and profile cosmetics **must not be injected into the global app header**.

Current header concepts include:

- Explorer identity label
- Current season (`S1`, `Neon Reign` in the present mock)
- Level
- Notification access

Diagnostics is intentionally hidden. Three rapid taps on the Season control open Diagnostics.

---

## 7. Base / home logic

Base is the player's core home screen.

### 7.1 Main Dexo card

Contains the player's current Dexo, lifetime XP and growth progression.

Current mock baseline includes:

- Lifetime XP example: `2,356,254`
- Current Level example: Level 1
- Current level progress example: `120 / 500 XP`

The card supports Dexo interaction/reactions without adding unnecessary UI labels.

### 7.2 Next Critical Action

A conditional, high-priority action can appear below Dexo.

- It is configurable from Diagnostics.
- It is intended for genuinely important gameplay events, e.g. future Defense/War readiness.
- It should not become a permanent generic promo card.

### 7.3 Next Objective

Base includes a compact multi-step objective timeline showing:

- current objective
- starter/path progress
- milestone / next unlock

The timeline should end cleanly at the final step with no unused vertical tail.

### 7.4 Since Your Last Visit

A compact activity feed summarizing meaningful changes since the user's previous visit.

It is one outer section, not nested card-inside-card UI.

### 7.5 Optional promo banner

An optional banner slot exists below the header and above the Dexo card.

- Default: OFF.
- Diagnostics can toggle it.
- Manifest path: `/assets/banners/base-promo-banner.webp`
- Recommended source: 1200×260 WebP.
- The banner artwork itself is repository-maintained and not bundled in checkpoints.

---

## 8. Earn Center — core progression loop

Phase 3 is officially completed and closed.

Earn uses three permanent internal tabs:

`EARN | NETWORK | TYPING`

### 8.1 Earn tab

Purpose: daily progression and missions.

Current loop:

`Daily Core → Mission start → Verification → Reward ready → XP claim → Level progress`

Mission states in product terms:

`Available → In progress → Reward ready → Completed`

The underlying store currently uses `available / in-progress / completed / claimed`; UI translates these into user-facing states.

Current sample missions:

1. Explore Dalexio — 60 XP
2. View latest X update — 70 XP
3. Open Telegram community — 90 XP
4. Complete a Typing Arena run — 120 XP
5. Review explorer profile — 100 XP
6. Read Season One brief — 80 XP

Daily Core current mock reward: 40 XP.

Daily claim streak behavior:

- Claim today if today's local date has not yet been claimed.
- If yesterday was the last claim, streak increments.
- Otherwise streak resets to 1.

Earn persistence key: `dalexio-earn-state-v2`.

### 8.2 Network tab — referrals

Purpose: grow Dalexio through direct user invitations.

Personal referral link format currently uses:

`https://t.me/DalexioBot?start=dexoairdrop_<telegram_user_id>`

The user can copy or share the link through Telegram.

**Agreed referral business intent:**

- A newly invited user is not immediately treated as a successful referral.
- The invited user must grow to at least **Level 5**.
- Once that condition is met, the referral becomes successful/active.
- From that point, the inviter is intended to receive a share/reward tied to the referred user's activity/earnings.
- More successful referrals raise the inviter's referral tier and reward percentage.

Current frontend tier presentation:

- Bronze — 5%
- Silver — 7%
- Gold — 10%

Current UI code maps tier by verified referral count as:

- Bronze: fewer than 5
- Silver: 5–19
- Gold: 20+

**Important unresolved detail:** earlier product wording described Bronze as roughly “0 to 5” and the original mock report mentioned thresholds 5 / 20 / 50. Final backend tier boundaries must be confirmed before integration. Do not silently invent the final economics.

Referral table currently demonstrates the five latest invited users with:

- Telegram/photo or initials avatar
- name
- level
- Active/Pending status
- invite date
- activation progress such as `Level 4 / 5`
- earned XP when active

Frontend diagnostics can simulate referral verification.

### 8.3 Network tab — group/creator program

Purpose: support creators/community owners who bring Dalexio into large Telegram communities.

Agreed business intent:

- Creator adds Dalexio bot to a Telegram group/community.
- Bot must be made **Admin** for the group to qualify.
- User/community activity can generate reward/value for the creator.
- Reward ownership is tied to the registered **creator account**, not automatically split among every group admin.
- The section is intended to be important/special in the airdrop ecosystem, but should not be visually overdecorated.

Current group list demonstrates:

- group avatar/name
- bot admin status
- member count
- active/pending state
- recent activity
- XP earned

Current mock group-verification reward: 200 XP.

Real ownership verification, activity accounting, anti-abuse rules and payout logic are backend work.

### 8.4 Network history

History contains referral/group events. Empty state must have proper breathing room and never be visually glued to the section title.

---

## 9. Typing Arena business logic

Typing is a permanent lightweight mini-game under Earn.

Current rules:

- 30-second run
- pass threshold: at least 85% accuracy
- pass threshold: at least 10 WPM
- maximum 5 completed runs per local day
- daily attempt count resets by local date
- best result persists across days
- today's attempt history is shown

The practice sentence pool contains ~20 Dexo Land/game-world lines and intentionally avoids Signal/trading terminology.

Front-end casual anti-cheat:

- practice text cannot normally be selected/copied
- paste is blocked in the typing input
- context menu/drag/cut/copy shortcuts are blocked where relevant

This is only a UI deterrent. Real anti-cheat must eventually be server validated.

Dexo appears without the platform in the Typing Arena hero and uses a lightweight vertical floating animation.

---

## 10. Profile & Identity business logic

Phase 4 is currently implemented but **not yet officially closed** by the user. The latest checkpoint is v4.1.1 and is still under visual/behavior QA.

Profile has three internal tabs:

`OVERVIEW | ACHIEVEMENTS | COLLECTION`

Profile must remain a game identity page, **not a settings dashboard**.

Explicitly excluded from Profile unless the user later requests them:

- verification center
- notification settings
- privacy settings
- language settings
- session/device management
- generic security center
- logout/settings dashboard sections
- Dexo Showcase (removed because it makes Overview unnecessarily busy)

### 10.1 Overview

Overview is intended to contain only meaningful identity/progression/connectivity:

- Telegram profile photo or initials fallback
- first name / username
- profile-only frame
- profile-only active title; the decorative Title Plate is not used in the main Profile header because it interfered with the compact identity composition
- Level and XP progress
- concise core stats such as missions/streak/referrals/lifetime XP
- Wallet connect surface
- Dalexio Account connect surface
- Customize Profile
- Share Profile

The main global app header remains plain and unchanged. Profile title plates/frames are not used there.

### 10.2 Wallet connection

The Overview keeps a Wallet surface because Wallet support is part of the intended product, but the current frontend shows it as **Coming soon**.

Current UI rule:

- no fake `Connect` action
- no `Connecting` state
- no fake `Done` state
- no simulated wallet address

The existing store fields may remain for future integration. Real wallet SDK/network/provider selection is not yet integrated.

### 10.3 Dalexio account connection

The Overview keeps a Dalexio Account surface, but the current frontend shows it as **Coming soon**.

Current UI rule:

- no fake `Connect` action
- no fake linked-account handle
- no `Done` state

Real account linking will be connected when the backend/API contract exists.

### 10.4 Profile frames

Six frames are registered:

- Standard — available now
- Premium — available now
- Seasonal — available now
- Founder — available now
- Clan — reserved/hidden until Clan exists
- Captain — reserved/hidden until Clan Captain role exists

Only the first four should appear in the current visible collection.

### 10.5 Titles

Current title catalog:

- Explorer
- Early Pioneer
- Mission Runner
- Network Builder
- Community Voice
- Season Veteran

Title Plate is used only inside Profile/Customize/Share contexts.

### 10.6 Achievements

Current catalog contains ten achievements.

Available/current-system achievements:

1. **First Mission** — complete first mission — 100 XP reward in mock.
2. **First Referral** — activate first successful referral — 140 XP.
3. **Seven Day Streak** — reach 7-day streak — 240 XP.
4. **Thirty Day Streak** — reach 30-day streak — 800 XP.
5. **First Verified Activity** — community activity achievement — 500 XP.

Future Clan/War achievements are defined but not currently obtainable:

6. **Clan Ready** — meet clan participation requirement — 180 XP.
7. **First Clan** — join first clan — 260 XP.
8. **First Contribution** — first valid scoring contribution in Defense or War — 320 XP.
9. **First War** — participate in first clan war — 360 XP.
10. **First Victory** — win first clan war — 600 XP.

#### First Verified Activity — agreed rule

Business rule agreed in conversation:

- 200 **verified** community messages
- across at least 5 active days
- maximum 50 counted messages per day is the intended anti-spam cap
- only valid community activity should count; raw spam should not

Current frontend preview is intentionally `146 / 200` messages and `4 / 5` active days.

The exact verified-message classifier and 50/day enforcement are backend responsibilities and are not fully encoded in the current mock store.

#### First Contribution — agreed rule

Award when a user makes their **first valid scoring contribution** in a Defense or War.

Merely opening/joining the event should not be sufficient; the contribution must actually count toward the gameplay objective.

### 10.7 Medals

Canonical seasonal medals:

- Founding Season
- Season Participant
- Season Veteran
- Top 10 Percent
- Top 1 Percent
- Season Champion

Career medals currently visible:

- Activity Veteran
- Clan Loyalty
- Leadership
- Mission Master

A second generic/career Season Champion asset remains registered but is intentionally excluded from the visible collection to avoid duplicate reward identity. The seasonal Season Champion is canonical.

### 10.8 Customize Profile

Customize supports profile-only choices such as:

- active frame
- active title
- featured medal
- featured achievement

Choices persist through Zustand/localStorage using `dalexio-profile-state-v1`.

### 10.9 Share Profile

Share is currently **symbolic**, not an exported image product.

The preview should be visually clean and communicate:

- avatar/frame
- name/username
- title
- level / progression summary
- season
- featured honors

It should not pretend that a final image export exists. Telegram sharing is for share text/link until a real export/OG-card pipeline is intentionally added.

---

## 11. Profile modal / overlay behavior

Phase 4.1 established the required modal behavior because the first implementation broke when the page had been scrolled.

Profile overlays now follow this model:

- render via portal directly under `document.body`
- fixed to current viewport, independent of page scroll/route transforms
- full-screen backdrop from top to bottom, including behind bottom navigation
- respect Telegram/device safe areas
- lock the background/game scroll container while open
- preserve the exact previous page scroll position and restore it on close
- only the modal body scrolls
- modal header and action footer remain visible
- background navigation is inert while modal is open
- all detail states have a visible close action
- non-action states use `Got it`
- actionable states can use Equip/Feature/etc.
- primary modal buttons use the approved gradient button with clean corners and recurring left-to-right sheen
- avoid heavy live backdrop blur

This is the expected modal pattern for future similar mobile overlays unless the user changes it.

---

## 12. Notifications

A notification drawer exists in the main shell.

Current frontend behavior includes sample notifications, unread count and mark-as-read behavior. This is UI/mock logic; server notification delivery is not yet integrated.

---

## 13. Diagnostics

Diagnostics is a hidden developer/testing route intended to exercise frontend states without exposing unfinished controls to normal users.

Access: three rapid taps on the Season control.

Current diagnostics capabilities cover examples such as:

- show/hide critical Base action
- show/hide promo banner
- simulate referral/group verification
- complete missions
- move progression near evolution
- reset Earn
- profile unlock/state previews
- current/empty/champion profile scenarios

Diagnostics is a testing tool, not a user-facing product feature.

---

## 14. Current persistence model

Frontend persistence currently uses local storage for mock state:

- onboarding: `dalexio-onboarding-v1`
- Base UI: `dalexio-base-ui`
- Earn: `dalexio-earn-state-v2`
- Profile: `dalexio-profile-state-v1`

Earn active tab also uses session storage so Typing can return to the correct internal tab.

These are temporary frontend contracts, not final backend storage design.

---

## 15. Current technical stack

- React 19
- TypeScript 5.8
- Vite 7
- TanStack Router
- TanStack Query
- Zustand
- Zod
- Motion
- Hugeicons
- MSW
- Vitest
- Playwright
- Vercel deployment

Build command:

`npm run build` → `tsc -b && vite build`

Full validation command:

`npm run check`

---

## 16. Asset ownership and delivery policy

This is a critical project rule.

The main repository owns and serves approved product artwork. Checkpoint ZIPs should generally contain code + manifest paths, not duplicate product assets.

Never re-bundle these existing assets unless the user explicitly changes the rule:

- brand logos
- main/world background
- Dexo artwork
- Dexo platform
- the 31 approved Profile WebP assets (frames, cosmetics, achievements and medals)

The 31 Profile assets were supplied/reviewed for the first Phase 4 implementation and are now permanently treated as repository-maintained for future checkpoints. They must not be re-bundled just because Profile code is being changed.

Current checkpoints intentionally bundle only the development fallback:

`public/assets/system/missing-asset.svg`

The paths in `src/assets/manifest.json` must remain intact so the main repository can serve the artwork. Treat `src/assets/manifest.json` as the canonical runtime source for exact asset keys/paths, and treat `ASSET_MAP_PHASE*.md` as the supporting documentation map. Do not invent or rename repository-maintained paths from memory when those sources already define them.

For future artwork, only include a new asset in an output if it is actually required and the user has not said that it is repository-maintained.

---

## 17. Product language constraints

Signal/trading language was intentionally removed from Earn and Typing and should not reappear in future Dexo Land game development unless the user explicitly requests it. **This rule does not automatically reopen approved Base copy:** legacy Signal/trading wording that may remain in the already-approved Base should be left untouched unless the user directly asks for a Base change.

Use language around:

- Dexo Land
- missions
- exploration
- progression
- community
- network
- clans
- defense
- war
- seasons
- achievements

Do not drift back into generic signal/trading copy.

---

## 18. Backend/integration boundaries still intentionally open

The frontend currently demonstrates behavior, but these areas are not final business/backend implementations:

- authentication/bootstrap source of truth
- real mission verification
- final XP economy and balancing
- final referral tier thresholds and revenue-share calculation
- successful referral verification at Level 5
- group creator ownership and admin verification
- group/community message accounting
- verified-message anti-spam classifier
- Typing anti-cheat
- real wallet SDK/network
- real Dalexio account-link API
- season ranking computation
- Clan/War state machine
- reward issuance/token allocation/claim logic

When backend work begins, preserve the approved frontend contracts where possible rather than redesigning the UI without a product reason.

---

## 19. Future gameplay direction

The known planned major systems after Profile are:

1. Inventory
2. Clan
3. Arena / Defense / War
4. Alliance / World Events
5. Seasons / Leaderboards
6. Launch polish and final integration

Exact implementation details of these future systems should be defined with the user before coding. Do not invent complex mechanics simply to fill the page.
