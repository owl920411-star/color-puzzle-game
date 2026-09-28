# FLOWER CELL 5 — 2026-09-28

Base: cee6b44861f5b504ed07fad9576e9f475fc0113a.

Replaces the center bouquet with exactly three petals per cleared cell, simultaneously, using that cell's position and color. One/two/three/four full rows produce 30/60/90/120 petals regardless of combo. Each triplet uses its own cell as the perspective origin: one forward petal and two matching slightly spread petals. No board-wide sideways movement or sequential left/right launch. Petals grow toward the viewer, tumble and fall. Previous count/wave expectations are replaced because the user explicitly requested per-block triplets. The 180-particle global lifecycle bound remains; older effects make room for new clears.

26/26 targeted effect/control tests PASS, including exact per-cell counts and origins, simultaneous start, per-cell horizontal balance across 50 frames, depth growth/tumble/gravity, reset/expiry and input regressions. Actual renderer frames visually inspected at 100/260/560ms. Full RC suite not rerun; previous nine unrelated failures remain unresolved. Full browser/Android feel and performance NOT VERIFIED.

No control, rule, scoring, audio or storage changes. Cache key: cb-flower-cell5.
