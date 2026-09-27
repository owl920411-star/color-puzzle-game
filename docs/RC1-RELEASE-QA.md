# CRAYON BLOOM RC1 release evidence

## Scope and protected behavior

Baseline main: `b9f6904e2c8dbd1ca33f554c6350a68545043acb` (MAIN 9).
The actual single-mode build was used, not the older handoff version.
No removed mode was restored. Board geometry, engine collision, scoring, item
rules, BLOOM/ground rules and Adaptive logic remain unchanged.

CONTROL 23 keeps first165ms and repeat38→33→29ms. The sole Phase1 correction
retired `carry()` across piece replacement, preventing direct HOLD from passing
an old touch to the replacement piece. Five controller source spans are frozen
and tested by SHA-256. Tutorial result observers are outside those spans.

## Presentation and lifecycle

- One reusable mascot layer;12fixed small marks;820ms normal/450ms reduced.
- Two original128-beat BGM scores, one AudioContext and one80ms scheduler.
  No ordinary per-cell movement sound or haptic was added.
- Home finite970ms entrance,388ms same-page return; reduced-motion immediate.
- Nine data-driven tips. Prepared loading transition180ms; slow preparation
  bounded1200ms. A discovered background-loading race was fixed: blur, hidden,
  pagehide and HOME cancel pending preparation and invalidate its result.
- Game entry removes covered menu DOM. The covered/hidden board no longer draws
  or updates each frame. Normal gameplay uses the existing loop and input timer.

## Tutorial

One reusable lesson module observes actual controller results. It never handles
board pointer events or implements fake movement. The adapter records event source
passively and observes successful move/rotate/hold/lock/clear results.

| Step | Real completion condition |
|---|---|
|1|One successful left board tap in PENDING|
|2|One successful right board tap in PENDING|
|3|Two successful moves in actual REPEATING within160ms|
|4|Successful horizontal-swipe rotation|
|5|Successful upward-swipe HOLD|
|6|Successful downward-swipe lock|
|7|Successful lock from the existing 쏙 button|
|8|Actual manipulation and actual row-clear result on safe I-piece board|
|9|Shared combo system demonstration for1.6s|
|10|Actual Game Start button|

Wrong input resets only the training fixture after the current action returns.
Success feedback350ms. Pause suspends pending lesson transitions. Explanation
steps8/9(zero-based) have no active piece. Completion and SKIP add
`glassfall-v1.tutorialCompleted=true`; Settings can replay. Existing keys are
merged rather than reset. Practice disables gravity/items/ground, skips starting
an Adaptive session, excludes record saves and starts a fresh normal run on exit.

## Browser results so far

Candidateb5cff1e: CONTROL counted regression PASS, full tutorial/skip/replay PASS,
lifecycle10PASS, combo/audio input PASS. JSON evidence is under`docs/qa/`.
First/warm loading measured180.7/180.0ms; observed end-to-end transitions212.7/202.6ms.
CONTROL trace: first move167.8–177.0ms; right repeat38.3/33.2/29.3/29.1ms;
left sample43.2/33.9/37.9ms in cloud browser; post-release extra moves0.
This is browser synthetic PointerEvent evidence, not physical Android capture.

Actual production page reload retained best36 and changed sound/BGM/SFX/haptic/
effects settings. Original preference values were restored. SKIP completion
survived reload and subsequent Start entered normal play without tutorial.
No localStorage clear/remove was used.

## Pending release gates

Exact360/390/412viewport screen inspection and real-wallclock30minute combined
soak are in progress. Final version/cache/build verification follows those gates.
Android hand feel, volume, physical vibration, readability and lesson understanding
remain NOT VERIFIED until the user tests the actual phone.
