# Mobile Performance Profiler v4

1. Deploy the patch.
2. Open System Diagnostics on the real Telegram mobile client.
3. Reset metrics, then Start recorder.
4. Test Bottom Nav, Earn/Profile tabs, Notifications, Customize and Clan overlays.
5. Return to Diagnostics after at least 10 interactions.
6. Capture the `Mobile interaction performance` card.

Each interaction is measured for the full 450 ms after pointer-down.
The important columns are:
- tap: pointer-down to first rendered frame
- max: worst frame gap during the 450 ms interaction window
- drop: estimated missed display refreshes using the detected device cadence
- LT: worst long task attributed to that interaction
