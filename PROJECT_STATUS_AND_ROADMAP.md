# Dalexio / Dexo Land — Project Status, Handoff & Roadmap

> **Snapshot date:** 2026-08-08  
> **Latest code checkpoint:** `dalexio-miniapp-phase4-v4.2-profile-polish` / package version `4.2.0`  
> **Current major phase:** Phase 4 — Profile & Identity  
> **Immediate continuation point:** deploy/test **Phase 4.2 Profile Composition, Modal Actions & Crispness Polish** on the real Telegram mobile WebView and apply only user-requested fixes.  
> **Important:** Phase 3 is officially closed. Phase 4 is implemented but has **not yet been officially declared finished** by the user. Do **not** start Inventory/Clan/Arena before the user explicitly closes Phase 4.

---

## 0. Current exact checkpoint — read this first

This is the exact continuation state a new chat must inherit:

- **Code baseline:** `Phase 4.2 — Profile Composition, Modal Actions & Crispness Polish`
- **Package version:** `4.2.0`
- **Previous stable code checkpoint:** `dalexio-miniapp-phase4-v4.1-profile-modal-polish.zip`
- **Previous v4.1 SHA-256:** `d1a0ac219939b226153a365dce706cc7bb636937e3066d6fe7e788f503436ad7`
- **Documentation handoff before this patch:** `dalexio-miniapp-phase4-v4.1-handoff-v2.zip`
- **Current distribution:** use the newest Phase 4.2 ZIP delivered with this documentation and its companion `.sha256` file as checksum source of truth.
- **Code status:** Phase 4.2 fixes are implemented, but **the user has not yet confirmed the deployed/mobile result**.
- **Correct next action:** resume Phase 4 QA from v4.2. Do not redesign closed phases and do not advance the roadmap until Phase 4 is explicitly approved.

The current documentation-enhanced archive may receive a distribution filename/hash after packaging. When present, the companion `.sha256` file beside the delivered ZIP is the checksum source of truth for that distribution.

## 0.1 Current Phase 4 QA focus

The most recent implementation specifically fixed:

- Profile Title Plate order/spacing: the active plate now sits above the Telegram username instead of visually falling underneath the ID.
- Profile modal actions: single primary actions are narrower/centered and labels are larger; two-button Share actions are also width-constrained.
- Connections: Wallet and Dalexio Account are visible but marked `Coming soon`; temporary mock `Connect` / `Done` controls are not shown.
- Crispness audit: no active product-wide blur was found; persistent GPU-compositing hints were removed from large text-bearing surfaces to avoid softened text in Telegram mobile WebViews.
- Route motion keeps the approved fade + short slide but no longer applies a page-wide micro-scale.
- Profile modal motion keeps opacity + vertical movement without scaling the whole text-bearing modal.
- The v4.1 root modal fixes remain active: body portal, viewport-fixed backdrop, safe areas, background scroll lock, internal modal scrolling and persistent action footer.

These are the first things to verify when the project is opened in a new chat.

## 0.2 Approved / do not reopen without an explicit request

The following are considered settled product/UI decisions:

- **Phase 0** Intro/Foundation — closed.
- **Phase 1** Onboarding/Dexo acquisition — closed.
- **Phase 2** Main shell/Base — closed.
- **Phase 3** Earn/Network/Typing — officially closed by the user.
- **Phase 3.3 mobile motion profile** — permanent project standard for future pages.
- Approved Base, Earn, Network and Typing layouts should not be redesigned just to match a new idea.
- The main global header remains simple and must not receive Profile title plates, avatar frames, medals or profile cosmetics.

Previously approved areas may only be revisited when the user directly asks for a change or a technical dependency makes a narrow change unavoidable.

## 1. How to use this file in a new chat

When continuing this project in a fresh conversation:

1. Treat the current project ZIP as the code baseline.
2. Read `PROJECT_PRODUCT_AND_BUSINESS_LOGIC.md` for product/business rules.
3. Read this file for exact development status and what remains.
4. Read `PROJECT_WORKING_INSTRUCTIONS.md` before making design/code decisions.
5. Do not restart earlier approved phases or redesign them unless the user specifically asks.
6. The latest direct user instruction in the new chat always overrides older documentation.

---

## 2. Current source checkpoint

Latest generated checkpoint before this documentation update:

`Phase 4.2 — Profile Composition, Modal Actions & Crispness Polish`

Package version:

`4.2.0`

Main current routes:

- `/` — Intro/Foundation
- `/onboarding`
- `/base`
- `/earn`
- `/earn/typing`
- `/clan` — placeholder/reserved
- `/arena` — placeholder/reserved
- `/profile`
- `/diagnostics` — hidden developer route

---

## 2.1 Real development and QA workflow

The actual working loop used in this project is:

`Implement locally → package ZIP → user replaces/pushes source in GitHub → Vercel production build → test inside the Telegram test bot on a real phone → user sends screenshots/feedback → apply focused fixes`

Important implications:

- Desktop browser/Vercel preview is not the final UX authority; the Telegram mobile WebView is.
- A build is not considered safely deliverable just because syntax transpilation passes. Vercel has previously caught a real `tsc -b` error that syntax-only validation missed.
- Mobile performance feedback from the user's real device overrides desktop smoothness assumptions.
- When the user says a phase is closed, continue from that checkpoint rather than broadly refactoring earlier accepted work.

## 3. Phase history

### Phase 0 — Intro / Foundation

**Status: approved and closed.**

Final basis: v0.4.

Key decisions:

- Intro always appears first.
- `DEXO LAND` received approved wider horizontal spacing.
- v0.5 direction was deprecated and should not be treated as the final basis.

Do not reopen this phase unless explicitly requested.

---

### Phase 1 — Onboarding / Dexo acquisition

**Status: approved and closed.**

Completed behavior:

- New user: `Intro → Onboarding → Dexo acquired → Base`
- Returning user: `Intro → Base`
- Telegram first name used for friendly identity.
- Dexo dialogue moved above character.
- Typewriter dialogue implemented.
- Reaction dialogue rotation avoids immediate repetition.
- Reaction returns to level-appropriate Dexo after ~10 seconds.
- Asset preloading begins early.
- Removed unnecessary full-screen preloaders between Intro/Onboarding/Base.

No brand/world/Dexo assets should be bundled in future checkpoints.

---

### Phase 2 — Main shell and Base

**Status: approved and closed.**

Completed:

- permanent mobile game shell
- icon-only bottom navigation
- Base / Earn / Clan / Arena / Profile routes
- global header with season, level and notifications
- Notification Center
- hidden Diagnostics via triple-tap Season
- finalized Base Dexo card
- lifetime XP and growth progress
- Dexo reactions
- dynamic Next Critical Action
- Next Objective timeline
- Since Your Last Visit
- Base quick status
- optional Base promo banner, default OFF
- banner diagnostics toggle
- several density/responsive cleanup passes

Important closed visual decisions:

- no visible Diagnostics button in normal UX
- no bottom-nav text labels
- Base timeline has no extra trailing vertical space
- Since Your Last Visit has no nested inner card treatment
- Base promo artwork is not bundled

---

### Phase 3 — Earn / Core Game Loop

**Status: officially declared finished by the user.**

The final approved structure is:

`EARN | NETWORK | TYPING`

#### Earn completed

- Daily Core claim
- streak logic
- six missions
- active/completed sections
- mission verification/reward-ready flow
- XP claim and level progress
- reward reveal
- level-up/evolution state
- shared stats

#### Network completed

- personal referral link
- copy and Telegram share
- help/info sheet for referrals
- Level 5 successful-referral concept
- referral tier presentation
- latest referral rows with avatar fallback
- activation progress
- creator/group help sheet
- group admin/member/activity presentation
- network history

Latest frontend tier UI:

- Bronze 5%
- Silver 7%
- Gold 10%

Current code thresholds are Bronze <5, Silver 5–19, Gold 20+. Final backend thresholds are still a business-confirmation item.

#### Typing completed

- permanent Typing dashboard
- 30-second arena
- 85% accuracy threshold
- 10 WPM threshold
- five completed runs per day
- best result and today history
- ~20 Dexo Land phrases
- no Signal terminology
- casual anti-copy/paste protection
- centered floating Dexo without platform

#### Phase 3.2 final polish completed

- Earn title/subtitle responsive fixes
- Network hero density fixes
- removed gold tier border emphasis
- removed colored avatar rings
- mobile typography cleanup

#### Phase 3.3 mobile performance completed

The user tested it on phone and explicitly said it was **much better**.

Permanent rules established:

- mobile-first / Telegram WebView-first
- transform + opacity primary animation
- no animated blur
- no large live backdrop blur
- short travel distances
- pause background animation under overlays
- target stable 60 FPS

This performance profile must be applied to all future pages.

---

## 4. Phase 4 — Profile & Identity

**Status: active, not officially closed.**

### 4.0 initial implementation completed

Implemented:

- `Overview / Achievements / Collection`
- Telegram photo/name/username
- initials fallback avatar
- profile-only avatar frame
- profile-only title plate
- Level/XP progress
- key progression summary
- mock Wallet connection
- mock Dalexio Account connection
- Customize Profile
- featured medal
- featured achievement
- Share Profile preview
- Telegram share flow
- achievement filters/states/details
- frame/medal/title collection
- profile persistence
- profile diagnostics

User decisions that must remain:

- **No Dexo Showcase in Profile.** It was considered unnecessarily busy.
- Do not make Profile a dashboard/settings center.
- No verification/settings/privacy/language/security/session management sections.
- Main app header stays simple.
- Profile assets/title plates are only for Profile/Customize/Share.

### Profile asset catalog reviewed

31 approved profile-related WebP assets were reviewed:

- 6 avatar frames
- 4 profile cosmetics
- 6 seasonal medals
- 5 career medals
- 10 achievements

After review:

Visible/current frames:

- Standard
- Premium
- Seasonal
- Founder

Reserved/hidden until Clan:

- Clan
- Captain

All approved Seasonal Medals are relevant.

Career medals used in visible collection:

- Activity Veteran
- Clan Loyalty
- Leadership
- Mission Master

The duplicate generic Season Champion medal is intentionally excluded from visible collection; Seasonal Season Champion is canonical.

### Achievement logic clarified

`First Contribution`

- for first actual valid scoring contribution in Defense or War
- merely opening/entering an event should not unlock it

`First Verified Activity`

- 200 verified messages
- at least 5 active days
- intended max 50 counted messages/day to discourage spam
- current mock preview: 146/200 and 4/5 days

### 4.1 latest polish implemented

The user reported four key problems in the first Profile build:

1. Title Plate felt pasted-on / visually disconnected.
2. Share button had gradient corner artifacts and lacked the recurring moving sheen.
3. Share preview felt too poster-like for something that is not actually exported.
4. Profile modals were fundamentally wrong on a scrolled mobile page: opening relative to document position, incomplete backdrop, missing safe area, background scroll, no persistent action button, etc.

Phase 4.1 implemented the requested fixes:

- recomposed Title Plate into a smaller identity badge
- standardized Profile/modal primary buttons
- fixed gradient corner artifact
- restored left-to-right button sheen
- moved Profile overlays to a `document.body` portal
- fixed viewport positioning
- full-screen backdrop
- safe-area spacing
- lock background/game scroll
- restore exact scroll position on close
- modal body is the only scrolling region
- header/footer remain visible
- page/nav inert under modal
- all details have actions; non-action states use `Got it`
- simpler symbolic Share Profile summary instead of fake export poster

### Current QA state

The user has **not yet given final approval of Phase 4.1** after deployment/testing in this conversation.

Therefore, the correct next product action after this documentation handoff is:

**Resume Phase 4 QA from v4.1 and apply only the user's requested fixes. Do not move to the next major phase until the user declares Phase 4 complete.**

Key things to verify on an actual phone:

- Title Plate now feels integrated with identity block.
- Share primary button has clean rounded corners.
- Share button sheen works smoothly.
- Share preview is acceptable as symbolic UI; user may still choose to simplify/remove it.
- Open Achievement/Medal/Customize/Share modal after scrolling far down.
- Modal opens in the current viewport, not at page top.
- Backdrop covers the entire phone viewport.
- Bottom safe area is respected.
- background page does not scroll.
- only modal content scrolls.
- action footer remains accessible.
- `Got it` exists on locked/already-complete information states.
- closing returns to the exact previous scroll position.
- animation remains smooth in Telegram mobile WebView.

---

## 5. Asset delivery status

Critical current rule:

From now on, **do not include the 31 Profile assets in source/checkpoint ZIPs**. They were supplied/reviewed for the first Phase 4 implementation and are now repository-maintained assets exactly like the existing Dexo/world/brand art. This rule is part of the current checkpoint, not a temporary optimization.

Also continue not bundling:

- logos
- main background
- Dexo assets
- Dexo platform

Canonical asset-path references are:

1. `src/assets/manifest.json` — runtime source of truth for exact asset paths/keys.
2. `ASSET_MAP_PHASE*.md` files — documentation/reference maps for approved phase assets.

Do not invent replacement paths or rename repository-maintained assets from memory when those sources already define them.

The main repository is responsible for the actual image files. A checkpoint should normally contain only code/docs plus `public/assets/system/missing-asset.svg` unless genuinely new approved assets are required.

---

## 6. Known technical issue history / validation lesson

In Phase 3.2 a Vercel build caught a real TypeScript error:

`Property 'useTelegramPhoto' does not exist ...`

Cause: `as const` created a union where only one row had the property.

It was fixed by introducing an explicit `ReferralRow` type with optional `useTelegramPhoto`.

Important process lesson:

- Syntax transpilation alone is not sufficient.
- Future delivery should run full `tsc -b` / `npm run typecheck` and preferably `npm run build` whenever dependencies/network allow.
- `npm run check` is the ideal complete validation command.
- Vercel remains the final production build check when local npm registry access fails.

---

## 7. Current validation toolchain

`package.json` currently provides:

- `npm run validate:structure`
- `npm run validate:assets`
- `npm run validate:imports`
- `npm run validate:motion`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run check`
- `npm run test:e2e`

The motion validator is especially important because the user already tested and rejected paint-heavy mobile animation behavior.

---

## 8. Remaining major roadmap

Do not subdivide these into unnecessary mini-phases unless the user asks. The user prefers implementing a major feature area, testing it, then sending fixes directly.

### Next only after Phase 4 approval: Inventory

Planned but not yet implemented as a real module.

Before coding, define with the user:

- what items exist
- item categories
- item ownership/equipping rules
- whether consumables exist
- reward sources
- relationship with Clan/War

Do not invent a complex inventory economy before these are agreed.

### Then: Clan

Current `/clan` route is only a reserved placeholder.

Known direction from existing placeholder/product discussion:

- discover/create/join clan
- clan headquarters
- identity/emblems
- shared progression
- joint missions/contributions
- future Captain role
- Clan/Captain profile frames become relevant here

Detailed clan business logic remains to be designed with the user.

### Then: Arena / Defense / War

Current `/arena` route is placeholder only.

Known direction:

- opponent/match state
- preparation
- defense
- contributions
- battle resolution
- result/reward
- First Contribution / First War / First Victory achievements connect here

The actual battle state machine is not yet defined.

### Then: Alliance / World Events

Planned later layer for larger-scale social/world participation. Details not yet locked.

### Then: Seasons / Leaderboards

Seasonal ranking and reward logic will activate the existing medal identities:

- participant
- veteran
- top 10%
- top 1%
- champion

Final rank calculation, eligibility and season reset behavior remain undefined.

### Final: launch polish / backend integration

Includes eventual work such as:

- real bootstrap/API
- real persistence
- mission verification
- wallet integration
- Dalexio account connection
- referral/group verification
- anti-cheat
- real rewards/tokenomics
- server-driven notifications
- production QA
- launch performance/accessibility polish

---

## 8.1 Signal terminology scope — do not over-apply cleanup

The explicit product decision was to remove Signal/trading terminology from **Earn, Typing and future Dexo Land game development**.

An older already-approved Base implementation may still contain legacy Signal-related wording. Do **not** retroactively rewrite or redesign the approved Base solely to purge that terminology unless the user explicitly asks. This prevents a future chat from reopening closed Phase 2 work based on a later Phase 3 copy rule.

## 8.2 Mock/config values are not final economics

The frontend intentionally contains mock/config values for testing UX and state transitions. Unless a value has been explicitly approved as a final business rule, do not treat it as production tokenomics or backend economics.

This applies especially to:

- XP amounts and reward values
- level progression numbers/formulas
- referral tier thresholds
- referral/group XP and revenue-share examples
- mock user/group counts and history data
- season statistics/rank examples
- wallet/account connection states
- airdrop allocation/token claim numbers

A future assistant may preserve these values for frontend continuity, but must not present them as final economic policy or encode them into backend logic without confirmation.

## 9. Open decisions that should not be silently assumed

These are known unresolved items:

1. Final referral tier thresholds. Current UI code uses Bronze <5 / Silver 5–19 / Gold 20+, but older mock notes included 5/20/50 and user wording around Bronze included “0 to 5”. Confirm before backend implementation.
2. Final referral revenue-share formula and what “earnings” means economically.
3. Exact group/creator reward formula.
4. Definition/classification of a “verified message”.
5. Backend enforcement of max counted messages/day for First Verified Activity.
6. Final Wallet network/provider/SDK.
7. Dalexio Account linking API behavior.
8. Inventory mechanics.
9. Clan rules/roles/requirements.
10. Arena/Defense/War mechanics.
11. Season scoring and leaderboard rules.
12. Final airdrop/token allocation/claim mechanics.

A future assistant should ask/plan around these when they become relevant, not fill them with generic assumptions.

---

## 10. Current handoff sentence

If a new chat needs one concise state statement, use this:

> **Dalexio Dexo Land is a Telegram-mobile-first gamified airdrop/community Mini App. Phases 0–3 are approved and closed, including the optimized Earn/Network/Typing loop and the mobile motion standard. Phase 4 Profile & Identity is implemented through v4.1 but is still under user QA; the immediate next step is to test/fix v4.1 Profile, especially title composition, Share UI and the new viewport-safe modal system. Do not start Inventory/Clan/Arena until the user explicitly closes Phase 4.**
