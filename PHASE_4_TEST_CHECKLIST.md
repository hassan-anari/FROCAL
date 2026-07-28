# Phase 4 Mobile Test Checklist

Test inside the Telegram Mini App at 320–460px width.

## Overview
- Main application header remains unchanged.
- Telegram photo/name appear correctly; fallback initial appears without a photo.
- Standard frame and Explorer title render only inside Profile.
- Level progress and four summary stats fit without horizontal overflow.
- Wallet and Dalexio account controls move from Not connected → Connecting → Connected.

## Customize Profile
- Sheet opens and closes smoothly.
- Frame, title, featured medal and featured achievement preview before Save.
- Save persists after refresh.
- Locked items cannot be equipped.

## Achievements
- Filters switch without jank.
- Current, in-progress and future-path states are visually distinct.
- First Verified Activity shows both 146/200 messages and 4/5 active days in its detail sheet.
- First Contribution copy references a valid Defense or War contribution.

## Collection
- Frames show Standard, Premium, Seasonal and Founder only.
- Clan and Captain frames remain hidden.
- Seasonal and Career medal groups render correctly.
- Generic duplicate Season Champion medal is not visible.
- Titles equip and persist.

## Share
- Preview shows selected frame, title, level and featured honors.
- Copy link works.
- Share in Telegram opens the Telegram share flow.

## Performance
- Tabs and sheets use smooth transform/opacity motion.
- No live blur or backdrop-filter appears.
- Long lists scroll smoothly and off-screen artwork loads lazily.
