# CONTROL 21 — short input rhythm tuning; phone feel not yet approved
Base main: 436a0f05516ab87e6fe3e3693ab5f113915e47a4.

Existing CONTROL 20: tap committed on pointerup; no added release delay. Pending
hold confirmed at170ms then immediately repeated at38ms. Clear travel after a
committed repeat only cancelled, requiring lift before another swipe.

Changes restricted to normal touch:
- Keep tap-on-release to avoid speculative movement when the gesture becomes a swipe.
  Draw immediately after successful tap/swipe, so feedback need not await another RAF.
- Single timer: confirmation+first step165ms, intervals48ms then42ms then36ms steady.
  Expected seven-step trace165,213,255,291,327,363,399. Previous seven-step trace
  170,208,246,284,322,360,398: total traversal remains effectively unchanged.
- Explicit swipe travel now cancels the repeat timer BEFORE exactly one rotation,
  HOLD or harddrop, as requested in this turn. Movement already made by a hold is
  not undone. Subsequent pointermove/up cannot retrigger or move a replacement piece.
- Existing26–28px swipe threshold and jitter allowance unchanged. Side is fixed from
  pointerdown x relative to the board midpoint; center drift never flips direction.
- No interpolation: avoid ghost/logical offset, lag and trailing motion on release.
  No per-cell haptics, animation/effect, CSS, difficulty, item, score, Adaptive or save
  changes. Sand remains unchanged and present. Home changed version text only.

Validation:129 test entries PASS. Includes each side30 taps, each side10 holds,
each horizontal direction20 swipes,20 HOLD/20DROP,100–250ms boundary sweep,
micro jitter, stationary repeat without update, collisions and wall rotation,
second-finger drop, click guard, replacement, pause/resume and actual crayon FX.
Added center-crossing tap and seven-step steady-rhythm checks.
Developer synthetic trace confirms release has0 additional steps;80ms tap executes
at80ms in the pointerup handler. Browser timer/paint scheduling and physical touch
latency must be distinguished from deterministic-clock results.

QA performance page records real-browser synthetic hold and tap timing, frame cadence,
long tasks and draw/HUD CPU cost. This is development-only and not normal game UI.
Mobile subjective smoothness remains for the user to confirm; do not claim final approval.
