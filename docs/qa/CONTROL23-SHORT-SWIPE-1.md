# CONTROL 23 — short swipe rotation, 2026-09-29

The user explicitly requested, during the toy-lab task, that a swipe after a long press must no longer rotate. This is the sole authorized production behaviour change in this task.

- A horizontal swipe must reach the existing distance threshold before the existing 165 ms long-press threshold, while input is still PENDING.
- REPEATING and BLOCKED gestures retain their original movement direction and cannot rotate. Releasing still stops the timer. A new short swipe can rotate normally.
- An elapsed-time check also covers delayed timer delivery.
- Upward HOLD, downward hard drop, the explicit buttons, keyboard, 165 ms repeat start and 38 → 33 → 29 ms repeat intervals are unchanged.
- The app URL query changes to `cb-control23-shortswipe1`. Flower FX remains GAME12; audio remains AUDIO6.

The CONTROL freeze is deliberately renewed for **touch-and-buttons only**, following the user's explicit request. All four other frozen spans retain their original hashes. This is not a blanket removal of the gate.

Executed at this checkpoint: 67 input/button/tutorial tests passed. Includes 164/165/166 ms boundaries, both directions, release-only gestures, wall-blocked long presses, release stops, fresh short gestures, and vertical gestures after a long press.

Freeze results: 4/5 passed, including the renewed touch span. The `actions` span fails with actual hash `d8833af2ea959650af804dbca37308700b316956dc59217cd80c19a96f89415c`; the unchanged base commit a7ee37e has the same hash. This is an existing stale baseline, not a change made here. It has not been silently re-blessed.

Android hardware verification and the user's comfort assessment remain unverified. Test on phone: hold left/right until rapid movement begins, slide sideways and release (no rotation, motion stops); lift, then quickly swipe sideways (one rotation); swipe up/down (HOLD/drop).
