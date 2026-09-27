# RC1 · Phase 6 loading and tips

Files: `src/bloom-loading.js` / `.css` and identical `dist/` copies. The module owns presentation and one cancellable wait; it has no gameplay, storage, pointer or keyboard handlers.

## Integration contract

```js
const loading = BloomLoading.create({
  show: html => showPanel(html, 'loading'),
  prepare: async () => celebration.preload(),
  reduced: () => reduced
});
const result = await loading.run();
if (!result.cancelled) requestActualGameStart();
```

Root integration supplies asset preparation and the actual game transition. Audio activation must remain on the original user interaction path; never wait for audio to play before resolving loading. Call `cancel()` when leaving or superseding the request. A second `run()` settles the previous promise as cancelled before starting the next.

Result: `{elapsed, ready, cancelled}`. `ready` reports the preparation result, not the game state; `prepare()` returning `false`, throwing, rejecting or timing out yields `ready:false` and still allows fail-open transition. Cancelled results must never start a game.

`stats()` reports active status, current timer count (0 or 1), completed/cancelled request counts and the last result. It does not create a polling loop.

## Timing

- Warm/prepared path: minimum 180 ms, enough for a short natural transition without an artificial 1-second delay.
- Cold path: finishes as soon as preparation is ready after the minimum.
- Stalled preparation: bounded at 1200 ms; late resolve/reject is handled and ignored.
- Cancellation: clears the sole live timer and settles immediately.
- Ready text is displayed during any remaining short warm transition. No fictional percentage or progress bar.

The controller replaces its maximum deadline with the remaining minimum delay when preparation settles; it never runs two controller timers concurrently. A blocked browser main thread can delay any browser timeout, so these durations are scheduling bounds rather than physical-device measurements.

## Presentation

Warm paper, current official Korean logo, current baby-and-chick hero, one small finite crayon-stroke reveal, status and one random tip. Existing home imagery is reused; this module does not introduce image decoders. Root preload owns readiness. The UI is scoped to `.cb-loading`, including 360×640 small-screen rules. Reduced-motion skips the stroke animation.

`BloomLoading.TIPS` is an exported frozen array of 9 short tips. Exactly one tip is chosen per run and remains stable when status becomes ready. No new game concept is introduced.

## Focused verification

6 module tests plus 5 frozen CONTROL tests passed. Tested warm 180 ms, cold 670 ms, stalled 1200 ms, synchronous false/rejected preparation, late rejection, cancel, overlapping requests, one-live-timer bound, frozen tips, official assets, reduced motion markup, no input/storage/event/RAF loop and source/output equality.

Browser display measurements and mobile screenshots remain part of integration Release QA, not claimed by these deterministic tests.
