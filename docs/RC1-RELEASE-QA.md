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

## Browser regression results

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

The strict first-install fixture also passed in the browser: storage was empty
before application boot (entries 0, writes 0, best 0, no tutorial completion).
Real Start, all ten tutorial steps, wrong-input rejection, pause/resume, finish,
SKIP, replay and returning-user Start passed without a seeded best/preferences.
Its prepared loading measured 180.1 ms (193.1 ms end-to-end). Evidence is
`docs/qa/first-install-review.json`.

Mobile geometry checked all 15 combinations of HOME/LOADING/GAME/TUTORIAL/OVER
and 360×640, 390×844, 412×915. No essential controls or text were clipped.
Two enlarged hero image boxes extend 15 px past the paper edges by design;
manual screenshots confirm only decorative bleed, with baby/chick faces and
the complete Start button visible. The 390 iframe entrance exceeded the QA
2-second wall-clock deadline, although all seven animation states were finished
by inspection. It remains a cloud animation-timing limitation, not a claim of
verified phone timing. No animation was forcibly finished to pass the check.

Visual review found an actual preexisting result-screen contrast defect: pale
legacy score/meta text on the warm paper panel. Only result/meta/storage-note
ink colors were corrected; scoring, layout and controls were unchanged.
Post-deployment screenshots at all three sizes confirmed readable score, records and controls. Contrast against the paper background is 6.37:1 / 5.96:1 / 5.18:1 for the corrected text colors.

## Release gates

### Real-time combined run — completed

Started 2026-09-27 13:57:36 UTC on candidate `a0d2c04`. Actual duration
1,801,058.9 ms, with 1,650 drops, 152 restart cycles and 118 forced item scenarios.
BGM/SFX, cutins and actual controller actions ran together in foreground, using
isolated memory storage. This is not accelerated time and not an Android test.

| Actual milestone | DOM | JS heap | Contexts | Tracked timers | Cloud average FPS |
|---|---:|---:|---:|---:|---:|
| 10 min (600,113.8 ms) | 130 | 6.55 MB | 1 | 1 | 23.07 |
| 20 min (1,200,548.6 ms) | 130 | 7.56 MB | 1 | 1 | 23.19 |
| 30 min (1,800,790.3 ms) | 130 | 7.52 MB | 1 | 1 | 23.13 |

All three milestones: errors 0, broken images 0, hidden-frame samples 0 and home
animations 0. Timer peak 2; audio voice peak 15 of the allowed 28. Heap samples
between milestones rose and fell (for example 6.96 MB at 25 minutes), without
steadily increasing DOM/context/timer ownership. A heap snapshot investigation
was not performed; this does not prove that every possible leak is absent.

After stop: paused, pointer null, tracked timers 0, audio voices/timers 0,
AudioContext suspended, cutin/loading/tutorial timers 0, heap 7.26 MB. Pause
menu DOM is 138; its eight extra elements are the visible pause menu.

Cloud RAF recent median 33.3 ms / p95 50.0 ms; maximum frame gap 1,083.1 ms across
the mixed lifecycle run. Sixteen long-task entries were observed (maximum
221 ms). **This is not a 60 FPS or mobile smoothness PASS.** Input regression
and bounded resource/lifecycle results are separate from real-device performance.
Evidence: `docs/qa/soak-10min.json`, `soak-20min.json`, `soak-30min.json`.

| Gate | Current status |
|---|---|
| Exact 360 / 390 / 412 viewport screen inspection | PASS for layout/readability after manual image review; phone animation cadence NOT VERIFIED |
| Real wall-clock 30-minute combined soak | PASS for bounded resource/lifecycle checks; phone FPS NOT VERIFIED |
| Local final version, cache and build verification | PASS; final live deployment verification recorded separately |
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

## Final RC label and validation

- Screen: `RC1 · CONTROL 23 FINAL · HOME RC1`.
- HTML build: `CB-RC1`; all runtime JS/CSS keys: `cb-rc1`.
- Editable presentation source and generated distribution are identical.
- Active-runtime gate: 295 tests PASS; frozen CONTROL spans 5/5 PASS.
- Canonical GitHub Pages URL: https://owl920411-star.github.io/color-puzzle-game/dist/
- Final GitHub commit/deployment and actual production screenshot are verified by
  the release operator after this commit; the commit cannot contain its own SHA.
- Android touch feel, sound balance, vibration, cutin comfort, loading feel and
  lesson understanding remain NOT VERIFIED. RC1 is a candidate, not device approval.

The remote inspection browser emitted its own `chrome-extension://` metadata
transport errors. These are recorded separately from application errors; the game
error/rejection/resource monitor stayed at zero. They are not silently counted as
game failures, and no causal claim about their effect on FPS is made.
