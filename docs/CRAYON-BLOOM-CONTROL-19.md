# CONTROL 19 — stationary long press
Base main: 3c4455781f31fd15ebeaada5b658e40ca6b5110f (MAIN 7 / CONTROL 18 / HOME 1).
Design and mascot assets unchanged. Source controller remains dist/endless-app.js.

## Confirmed cause
Two independent clocks: pointermove/up hiddenRepeat armed at 115ms and moved once,
then rejected its own hold mode. The 170ms timeout subsequently armed another 150ms
wait. Deterministic 1ms real-controller trace before fix:
- stationary: 319,357,395,433,471ms
- 1px jitter: 121,319,357,395,433,471ms
This explains a premature single step followed by a 198ms pause; the later 38ms
repeat constant alone did not describe the full gesture.
Actual CrayonBloomFX.update always returns false: hitStop is not an active cause.
Home styles are scoped to the home panel; the illustration is static, not an ongoing
home animation. Physical-device frame cost has not been measured.

## Narrow correction
170ms timeout confirms the stationary hold and performs the first collision-checked
step. Subsequent update calls use the same monotonic 38ms deadline. Pointermove and
pointerup cannot start a repeat. A release before confirmation performs one tap.
One step maximum per frame; expired backlog is discarded. Existing swipe thresholds,
collision/move functions and keyboard repeat timings are retained.
Normal block replacement clears input. Normal carry/restore previously moved a new
piece to the old lane on second-finger drop; carry is now restricted to sand, where
its established drag behavior is retained. Existing click guard remains unchanged.
No save migration/reset, score/item/adaptive changes, or design changes.

## Validation
After fix: down 0; confirmation and first move 170; moves 208,246,284,322;
release 322; no later movement. Same trace with 4px jitter and real crayon particles.
16ms simulated frames: first 176; subsequent 224,256,304,336,368 (32/48ms frame
quantization around 38ms cadence). A delayed 200ms frame processes only one step.
Tests include left/right 30 taps each, 114/115/150/169/170/171/207ms boundaries,
stationary hold, jitter, wall/stack collisions, short/long left/right swipes,
up hold/down drop, second-finger drop, followup click guard, cancel/lost capture,
pause/piece replacement and real sand horizontal-drag regression.
These are executable real-controller tests with deterministic clocks, not measurements
of physical touchscreen latency. Actual mobile feel still requires device verification.
