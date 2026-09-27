# CRAYON BLOOM RC1 release evidence

## Scope and protected behavior

Baseline main: `b9f6904e2c8dbd1ca33f554c6350a68545043acb` (MAIN 9).

The actual single-mode build was used, not the older handoff version. No removed mode was restored. Board geometry, engine collision, scoring, item rules, BLOOM/ground rules and Adaptive logic remain unchanged.

CONTROL 23 keeps a 165 ms initial delay and a 38 → 33 → 29 ms repeat cadence. The sole Phase 1 correction retired `carry()` across piece replacement, preventing direct HOLD from passing an old touch to the replacement piece. Five controller source spans are frozen and tested by SHA-256. Tutorial result observers are outside those spans.

## Presentation and lifecycle

- One reusable mascot layer, 12 fixed small marks: 820 ms normally, 450 ms with reduced motion.
- Two original 128-beat BGM scores, one AudioContext and one 80 ms scheduler. No ordinary per-cell movement sound or haptic was added.
- Finite home entrance: 970 ms on first display, 388 ms on same-page return. Reduced-motion display is immediate.
- Nine data-driven tips. Prepared loading transition: 180 ms. Slow preparation is bounded at 1200 ms. A discovered background-loading race was fixed: blur, hidden, pagehide and HOME cancel pending preparation and invalidate its result.
- Game entry removes covered menu DOM. The covered/hidden board no longer draws or updates each frame. Normal gameplay uses the existing loop and input timer.

## Tutorial

One reusable lesson module observes actual controller results. It never handles board pointer events or implements fake movement. The adapter records event source passively and observes successful move, rotate, hold, lock and clear results.

| Step | Completion condition |
|---|---|
| 1 | One successful left board tap in PENDING |
| 2 | One successful right board tap in PENDING |
| 3 | Two successful moves in actual REPEATING within 160 ms |
| 4 | Successful horizontal-swipe rotation |
| 5 | Successful upward-swipe HOLD |
| 6 | Successful downward-swipe lock |
| 7 | Successful lock from the existing 쏙! button |
| 8 | Actual manipulation and row-clear result on the safe I-piece board |
| 9 | Shared combo-system demonstration for 1.6 seconds |
| 10 | Actual Game Start button |

Wrong input resets only the training fixture after the current action returns. Success feedback lasts 350 ms. Pause suspends pending lesson transitions. Explanation steps 8 and 9 (zero-based indices) have no active piece.

Completion and SKIP add `glassfall-v1.tutorialCompleted = true`; Settings can replay the tutorial. Existing keys are merged rather than reset. Practice disables gravity, items and ground, skips starting an Adaptive session, excludes record saves and starts a fresh normal run on exit.

## Browser results so far

Candidate `b5cff1e`:

| Check | Result |
|---|---|
| Counted CONTROL regression | PASS |
| Full tutorial, SKIP and replay | PASS |
| Lifecycle, 10 repetitions | PASS |
| Input during combo/audio | PASS |

JSON evidence is under `docs/qa/`.

| Measurement | Observed value |
|---|---|
| First / warm loading | 180.7 / 180.0 ms |
| End-to-end transition, first / warm | 212.7 / 202.6 ms |
| CONTROL first move | 167.8–177.0 ms |
| Right repeat sample | 38.3 / 33.2 / 29.3 / 29.1 ms |
| Left repeat sample | 43.2 / 33.9 / 37.9 ms |
| Extra moves after release | 0 |

These are cloud-browser synthetic PointerEvent results, not physical Android touch captures.

An actual production-page reload retained best score 36 and the changed sound, BGM, SFX, haptic and effects settings. Original preference values were restored. SKIP completion survived reload, and the subsequent Start entered normal play without the tutorial. No localStorage clear/remove was used.

## Pending release gates

### Real-time combined run (in progress)

Started 2026-09-27 13:57:36 UTC on candidate `a0d2c04`, with the game foreground,
BGM/SFX enabled, repeated actual drop/rotate/HOLD results, item scenarios,
cutins and home/restart cycles. This is wall-clock browser execution, distinct
from the accelerated model tests. It uses synthetic actions and isolated storage.

At 600,113.8 ms: DOM 130, one AudioContext, one active tracked timer (peak 2),
6.55 MB reported JS heap, zero errors/broken images, zero hidden-frame samples.
The cloud RAF average was 23.07 FPS (recent median 33.3 ms / p95 50.0 ms).
This is **not evidence of 60 FPS on Android**. Seven long-task entries were
observed (maximum 221 ms); no frame-rate or perceptual smoothness PASS is inferred.
At 1,200,548.6 ms: DOM 130, one AudioContext, one tracked timer, 7.56 MB heap,
zero errors/broken images/hidden-frame samples. Cloud RAF average 23.19 FPS,
recent median 33.3 ms / p95 50.0 ms. Twelve long-task entries, maximum still
221 ms. Thirty-minute and shutdown samples still pending; these heap samples
alone cannot establish either a leak or its absence.

| Gate | Current status |
|---|---|
| Exact 360 / 390 / 412 viewport screen inspection | NOT VERIFIED — in progress |
| Real wall-clock 30-minute combined soak | NOT VERIFIED — in progress |
| Final version, cache and build verification | NOT VERIFIED — follows the gates above |
| Android hand feel, volume, physical vibration, readability and lesson understanding | NOT VERIFIED — requires the user's actual phone |

Code implementation, automated tests, deployment success, browser inspection and physical-device acceptance are separate evidence categories. Pending gates must not be reported as PASS.

## Android acceptance checklist

All items below remain **NOT VERIFIED** until the user tests the actual phone.

- [ ] **Touch:** Left/right taps move exactly one cell. A stationary long press flows into fast repeat; lifting stops immediately. Horizontal swipes rotate once, upward swipe holds and downward swipe drops. Holding the board while pressing 쏙! does not pass input to the next block.
- [ ] **Audio:** Home/game BGM and effects sound comfortable together. Master sound, BGM and SFX settings behave as expected; audio does not delay play.
- [ ] **Haptics:** Supported vibration feels brief and appropriate. Ordinary repeated movement does not produce a vibration for every cell.
- [ ] **Mascot cutins:** Baby/chick size and timing feel good; blocks and next actions remain readable, and touch stays responsive.
- [ ] **Loading:** The transition feels short and clear. Leaving during preparation does not unexpectedly start a game on return.
- [ ] **Tutorial:** Instructions are understandable without help. Real taps, hold, swipes and 쏙! advance the intended steps; SKIP and replay are easy to use.
