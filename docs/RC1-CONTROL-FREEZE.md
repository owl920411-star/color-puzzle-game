# RC1 CONTROL FINAL CANDIDATE freeze

Baseline inspected: `b9f6904e2c8dbd1ca33f554c6350a68545043acb` (main, single mode).
The production controller comment and behavior are CONTROL 23, not the older
CONTROL 18/21 notes in developer UI and historical tests.

## Confirmed behavior

- One captured pointer owns one `PENDING / REPEATING / BLOCKED` state and timer.
- Pointerdown sets direction once from the board midpoint. Tap commits immediately
  in pointerup, without a post-release delay or speculative pointerdown movement.
- At165ms the first successful move and `REPEATING` confirmation happen together.
  Follow-up intervals are38ms,33ms, then29ms. Deterministic move trace:
  `165,203,236,265,294,323,352`. This is not phone latency measurement.
- Repeat is not driven by pointermove, requestAnimationFrame, update dt or FX hit-stop.
  A late timer executes one step, without catch-up bursts.
- Under-threshold jitter keeps the same state/timer. Clear swipe travel first clears
  input and then executes one rotation/HOLD/drop. Threshold is26–28.08CSS pixels.
- Pointerup/cancel/lost capture/pause and physical secondary action buttons clear
  the owner/timer. Pointer-button-guard suppresses physical detail-zero click replay.

## Necessary pre-freeze correction

A real baseline failure was found: keyboard/API HOLD while a board repeat was held
called legacy `carry()`. That rebound the old gesture to the replacement piece and
continued moving it. Swipe HOLD and the physical HOLD button already cleared first.
The only runtime input correction is `carry(){return false;}`: discarded historical
position carry-over cannot reattach any gesture to a new piece. Timing, thresholds,
movement/collision methods and gesture classification are unchanged.

Historical tests were stale: they required deleted sand-micro.js and asserted the
CONTROL21 cadence. The test-only dependency was removed; sand was not restored.
Tests now use current CONTROL23 timings and the sole normal-mode runtime.

## Gate result

`node --test tests/control19-hold.test.cjs tests/control20-stability.test.cjs tests/pointer-button-guard.test.cjs tests/control23-freeze.test.cjs`

- Tap left30/right30: PASS (successful one-cell move per gesture).
- Long press left10/right10, stationary and jitter: PASS.
- Swipe left20/right20, plus long held swipes: PASS (one rotation, no lateral repeat).
- Up20/down20: PASS (one HOLD/drop and no transfer to replacement).
- Multitouch drop20, follow-up click: PASS.
-100–250ms boundary sweep, exact confirmation, release without trailing move: PASS.
- Wall/stack collision, wall rotation, replacement, cancellation, pause/resume: PASS.
- Real crayon particle code and no-update repeat timing: PASS.
- Source freeze checks: PASS.

The pre-freeze regression suite has56 test entries; bounded loops above are included
within those entries. Source freeze adds one entry per boundary listed below.

## Frozen boundaries

Source spans in `dist/endless-app.js` are SHA-256 guarded by
`tests/helpers/control23-freeze.json` and `tests/control23-freeze.test.cjs`.
Presentation, sound, loading and tutorial must observe engine/action results without
changing these spans. Any required change needs a documented reason and rerun gate.

- `clear-input`: `cb85a411efbab6f3db008be79fffab91db15efb08dc740f1297334c3d02eedbd`
- `touch-and-buttons`: `36d4677be78d0df4cc538141c057c3f824a0dcde93165473c131e813be76029c`
- `actions`: `a42d8a74adb2179cb8ce3331ac8e214be8b8fe50b1e1b77ec28358eaba51af54`
- `keyboard`: `67091d959f71410aee742c35b80c9aa64721c21819f627aee6da2cb3bacb01b2`
- `replacement-carry`: `23f332cdfbe25a26a53730159435790c60df2112d7dede40c3da0618fe2eee60`

No real Android-device test was performed by this gate. Browser timer/paint cadence,
phone cancellation frequency and subjective feel remain distinct verification items.

## User-approved hold-start correction · 2026-10-04

The user identified a hesitation immediately after the first cell, rather than
stuttering throughout sustained movement. The 2026-10-03 correction had moved the
second step to265ms to preserve one-cell205–250ms touches, but retained an early
165ms first step. Its100ms gap was the source of the reported start hesitation.

This targeted correction gathers the wait before movement: first step232ms,
second265ms, then294,323,352,381,410ms. A tap released before the first step still
commits one cell immediately in pointerup. The second-step boundary stays265ms.
This trades67ms later stationary-hold onset for a33ms first repeat interval,
followed by29ms intervals. It does not claim faster first response.

Quick horizontal swipes retain the separate165ms window. Cancellation, walls,
HOLD/drop, pointer replacement and keyboard behavior remain guarded. The
`touch-and-buttons` source hash is renewed for this explicitly requested change;
all other frozen span hashes remain unchanged. Both sides are swept through
150–264ms releases to guard the previously reported single-touch double move.
Real Android subjective feel must be confirmed by the user after deployment.
