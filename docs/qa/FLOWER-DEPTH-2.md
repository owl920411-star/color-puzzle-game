# FLOWER DEPTH 2 — 2026-09-28

Base: 3a9217e7296977707fb0d4968bd1cda96c025178.

Replaces flat line-clear petal spreading with projected forward motion. Flowers travel toward a virtual viewer, scale up to 3.83x, tumble across their faces, overlap in depth order and fall under gravity. Large foreground flowers are distributed across cleared cells. The stationary flower opening is removed; a short 150ms crayon stroke marks the cleared row. Item effects retain their original motion. No app/control/audio/rule/storage changes.

Validation: existing RC tests plus three effect tests: 315 total, 306 PASS and the same 9 pre-existing failures. Targeted FX and control tests: 23/23 PASS. Added checks for forward growth, tumbling, gravity, depth order and finite projection. Particle count remains capped at 180 and all effects expire/reset. Actual renderer inspected at 100/260/560ms using @napi-rs/canvas. Full browser and Android performance/feel NOT VERIFIED; Chromium unavailable in this session (earlier download attempts returned invalid archives).

Cache key: cb-flower-depth2. Audio src/dist mismatch and other pre-existing RC failures remain outside this change.
