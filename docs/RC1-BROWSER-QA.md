# RC1 browser QA harness

Entry: `dist/qa/rc-review.html` (noindex). This is a developer-only page, not linked
from production navigation. Its iframe loads the actual `../index.html?qa=1`.
It uses the existing QA API and real installed board pointer handlers.

## Visible controls

- Viewport selector:360×640,390×844,412×915.
- Home / game / gameover / snapshot controls for screenshot review.
- CONTROL full synthetic regression: each side30 taps,10holds,20horizontal swipes;
 20up/20down;20two-finger drop; jitter, wall, release and pause tests.
- Lifecycle10: start, drop, pause, resume, home, fresh start, forced gameover,
 retry, home. Uses actual lifecycle methods; forced gameover is explicitly QA.
- Combo/audio input: six cutin tiers/events with real board taps while visible.
- First-user/tutorial full flow: real Start/loading, wrong-input rejection, real
 taps/hold/swipes/drop button, safe-row completion, shared combo demo, actual finish,
 replay, skip and returning-user Start. Tutorial observations are never called by QA.
 The memory fixture sets tutorialCompleted=false, then actual Settings toggles refresh
 the runtime saved object and restore sound before the first Start.
- Tutorial screen button starts the actual tutorial fixture for viewport screenshots.
- Complete-new-user loader opens a generated copy of canonical HTML with an empty
 in-memory Storage property installed before application boot. It never touches
 native Storage. The same full tutorial button then verifies initial zero entries,
 zero writes, best zero and incomplete status, without inserting score/preferences.
 Asset URLs and cache keys remain byte-identical to the canonical entry.
- Actual loading screen/cancel button temporarily wraps the real celebration preload
 with a1000ms preparation promise, restores it afterwards and checks that cancellation
 cannot start a late game. It uses the actual bounded loading module and UI.
- Mobile geometry runs HOME/LOADING/GAME/TUTORIAL/OVER at360×640,390×844,412×915.
 It reports actual content viewport, element/image bounds, ancestor clipping, pointer
 hit targets, scroll and touch-target sizes. Images with transparent bleed are marked
 VISUAL REVIEW; essential clipped controls are FAIL. The iframe border is zero.
 It scrolls the iframe into view and waits for the natural finite home entrance;
 ancestor opacity is included in visibility checks. A throttled/timed-out animation
 is NOT VERIFIED, never force-finished to produce a passing result.
- Real30minute soak: asynchronous one-second driver, without accelerated clock.
 Records snapshots at actual10/20/30minute milestones. Stop button is available.
 Every15seconds a real item scenario forces a row transaction to exercise actual
 line-clear particles and item presentation, as well as naturally played actions.

Reports are rendered as JSON in `<pre>` elements. The root operator can click
legitimate QA buttons and inspect rendered DOM; no hidden browser state access is
needed. The runner does not change production source or frozen input handlers.

## Storage protection

On iframe load, its `localStorage` property is shadowed with an in-memory copy.
All subsequent preferences, bests and Adaptive writes affect that copy only.
The original storage object is read, never cleared or rewritten. Runs are also
marked practice/excluded through the existing QA objects. Reload discards the
memory copy and starts from the user's actual saved values again.

## Measurement boundaries

Pointer events are synthetic. Native setPointerCapture cannot accept an untrusted
pointer ID, so the QA dispatch helper temporarily bypasses capture for dispatch,
then restores it. This does not test physical touch capture, Android cancellation,
actual finger jitter or subjective feel. All reports say so.

RAF cadence, long tasks, errors, broken images, DOM element count, optional Chromium
heap memory and audio/celebration module stats are sampled. The timeout/interval
wrapper is installed after iframe load; it tracks subsequent timers. Module stats
cover ownership of preexisting audio/celebration timers. This instrumentation adds
some overhead, and snapshot heap values alone do not prove a memory leak.

The page reports visibility and hidden-frame samples. If the browser is backgrounded
or paused, elapsed wall time is still real, but that period cannot count as stable
foreground gameplay. Do not report a30minute foreground PASS based only on reaching
the timestamp. Read counters/errors/module growth and visibility evidence.

Audio settings are enabled using real settings controls inside the isolated copy
for the soak. Autoplay policy may still keep the context suspended. Report the
recorded context state; never infer audible sound from code execution.

This harness cannot certify real Android FPS, volume, haptics or touch feel.
The first-user button exercises integrated tutorial/loading through their real UI and
existing QA status accessors. Browser execution and viewport review remain required.
