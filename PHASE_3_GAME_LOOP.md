# Phase 3 Core Game Loop

## Player flow

```text
Open Earn
→ Claim Daily Core
→ Complete Daily Signal
→ Play Typing Protocol
→ Invite an Explorer
→ Claim XP Rewards
→ Level Up Dexo
→ Continue Starter Path
```

## XP balance used in the frontend mock

| Action | XP |
|---|---:|
| Daily Core | 40 |
| Daily Signal | 80 |
| Typing Protocol | 160 |
| Invite an Explorer | 140 |

A new player begins at `120 / 500 XP`. Completing the first loop crosses the first level threshold so the Level Up experience can be tested without Diagnostics.

## Typing Protocol pass conditions

- Complete the entire phrase
- Minimum accuracy: `85%`
- Minimum speed: `10 WPM`
- Timer: `30 seconds`

## Persistence

The frontend mock persists:

- Daily claim date
- Streak
- Mission states
- Typing best result
- Referral state
- Level and XP
- Lifetime XP
- Mission history

Storage key:

```text
dalexio-earn-state-v1
```

## Diagnostics controls

- Verify referral
- Complete starter path
- Move progression near Level 5 evolution
- Reset Earn state
- Open Earn
- Open Typing Protocol
