# Phase 4 Asset Map — Profile & Identity

The approved Profile pack is repository-maintained. Checkpoint ZIPs keep the exact manifest paths but do not bundle the 31 WebP files.

## Avatar frames
- `profile.frame.standard`
- `profile.frame.premium`
- `profile.frame.seasonal`
- `profile.frame.founder`
- `profile.frame.clan` — reserved for the Clan phase
- `profile.frame.captain` — reserved for the Clan Captain role

## Profile cosmetics
- `profile.cosmetic.titlePlate`
- `profile.cosmetic.achievementSlot`
- `profile.cosmetic.medalSlot`
- `profile.cosmetic.shareFrame`

These cosmetics are used only inside Profile, Customize Profile and Share Profile. The main application header remains unchanged.

## Achievements
Ten achievement paths are registered, including current Journey/Community achievements and future Clan/War achievements.

## Medals
Six seasonal medal paths and five career-medal paths are registered. The duplicate generic Season Champion remains in the registry but is intentionally excluded from the visible collection; the seasonal champion medal is the canonical season reward.

## Delivery policy
Only `public/assets/system/missing-asset.svg` is bundled. The main repository must continue serving every `/assets/profile/*.webp` path declared in `src/assets/manifest.json`.
