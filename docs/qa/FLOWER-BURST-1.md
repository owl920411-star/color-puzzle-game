# FLOWER BURST 1 — 2026-09-28

Base: a50d75cc62d4ef2986e9354d8543da956af20c72.

Line clears now open crayon flowers at the cleared cells, then launch matching colored petals with a fast burst, rotation, drag and gravity. Multi-line clears and combos increase the burst. Flower silhouettes have a continuous outline and cached crayon hatching. Item rules and existing celebration triggers are preserved.

Only the effect renderer, its HTML cache keys and effect regression tests change. No changes to endless-app, controls, timing, scoring, audio, saved settings, or game rules. Reduced effects continue to use the existing bypass. Max 180 moving particles, 3 bloom groups, 40 anchored flowers per group; no timers or hit-stop.

Validation:
- Existing RC suite before and after: 303 PASS / same 9 FAIL (pre-existing AUDIO6 source/version/freeze discrepancies). Not a full RC pass.
- Added effect lifecycle tests and existing control19-hold tests: 22/22 PASS, including real FX with input timing, repeated bursts, expiration and reset.
- Effect frames rendered through actual JS with @napi-rs/canvas at 100/260/560 ms and visually inspected. This is isolated renderer QA, not a full browser or Android test.
- Browser QA blocked: Chromium is absent and browser download returned invalid ZIP data.
- Android touch feel, FPS and device visuals: NOT VERIFIED.

The existing audio src/dist mismatch was not rebuilt or overwritten. Existing test expectations were not rewritten to hide failures.
