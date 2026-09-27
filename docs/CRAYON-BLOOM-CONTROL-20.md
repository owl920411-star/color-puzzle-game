# CONTROL 20 — mobile input stabilization candidate, awaiting phone validation
Base main c4497791c108f164b4315c0a99371b69265fc324, master handoff read.

## Reproduced CONTROL 19 defects
- Directional intent at 15–17px cancels hold, while swipe commits only at 26–28px.
  This gap leaves neither tap nor swipe. Peak radial distance >16 also aborts repeat.
- With 100ms initial dwell then 18px/22px horizontal travel (or 13px on both axes),
  releasing at 300ms yields ZERO moves. Previous 4px jitter tests missed this.
- After commitment, the old path could cancel movement and later rotate: two intents.
- Repeat ran inside update, coupling cadence to animation frames/gameplay gating.
  Actual CrayonBloomFX does not return hitStop. No evidence it is the direct cause.
- Short horizontal movement does not invoke hud; HUD is already throttled to 120ms.
  Home is static/hidden during play, board touch-action:none. No theme edits needed.
Actual physical-device cancel/lost-capture frequency and stalls remain unmeasured.

## Limited replacement
Normal pointer data: ID, piece, PENDING/REPEATING/BLOCKED, side, origin, swipe threshold,
one timer. Removed holdTimer, hiddenRepeat, repeatStarted/repeatNext and overlapping
normal gestureAxis/rotateIntent/holdIntent/dropIntent/peakDistance bookkeeping.
Sand retains its established drag path; keyboard repeat remains in update.
170ms confirms and moves; one 38ms timer per held pointer thereafter. No rAF dependency,
no backlog loop, no collision bypass. Blocked step ends timer. Release/cancel/lost capture,
pause/menu/button interaction and piece replacement clear the pointer and timer.
A pending swipe at the existing 26–28px threshold executes once immediately. Before
commitment swipe wins; after repeat commitment a large excursion stops movement and
never adds a rotation/drop to the same gesture. A new swipe requires lifting first.
This explicit choice enforces one action family per gesture.

## Validation
126 automated test entries including each side 30 taps, each side 10 holds,
each horizontal direction 20 swipes, 20 HOLD and 20 DROP, all durations 100–250ms,
6–25px jitter and diagonal jitter, walls/stack, second-finger drop/click guard,
release/cancel/lost capture, pause/resume, replacement, actual FX and sand regression.
Development clock: confirmation+first move170, then208/246/284ms; release adds no step.
Durations208–250 legitimately contain multiple REPEAT steps, never an extra release tap.
Timers also progress with no pointermove and no update calls. Delayed callbacks perform
one move, not a catch-up burst. Browser/physical timer scheduling may be later.
Separate noindex QA page /dist/qa/input-performance.html measures real-browser RAF,
long tasks, draw/HUD CPU cost and two bounded synthetic-pointer traces. No production
logs/panels; synthetic capture is stubbed only inside this QA page and restored afterward.
Physical touchscreen capture/cancellation and subjective feel are not covered by it.

## Protection
No design, mascot, CSS, item, difficulty, scoring, storage/reset, Adaptive rules,
board dimensions, game rail layout or sand removal changes. Home JS changes version only.
