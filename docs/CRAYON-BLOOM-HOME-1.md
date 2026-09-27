# CRAYON BLOOM HOME 1
Base: 3202b1bdb7c07eba202c131ed5a9b33187e0cebf, MAIN 6.
Official reference: user-supplied 10129(3).png, curly-haired baby in pink hoodie.

## Diagnosis
- Large modal panel with stacked generic cards and buttons.
- Tiny text/CSS stand-in for official baby and chick.
- Legacy art loader replaced mode previews with photorealistic glass/sand images.
- Flat system-font title and pastel colors did not express wax crayon material.
- Menu competed with the blurred game UI underneath.

## Source ownership
No pre-existing src/build pipeline: dist/endless-app.js was the directly authored controller.
New home source: src/bloom-home.js, src/bloom-home.css, src/assets/bloom-home-*.webp.
Build: node scripts/build-home.cjs copies only home files into dist; no npm dependency required.
Integration changes only showMenu() in existing controller. Rest is identical to base.
Generated files must not be edited instead of src files.

## Asset provenance
Built-in image generation, identity-preserving edit using official baby reference:
large same baby, black curls, peach round face, rosy crayon cheeks, pink hoodie,
small yellow chick, crayon, tiny blocks/flower/heart. Transparent illustration, no UI.
Separate custom Korean wax-crayon wordmark: 크레용블룸, exact five syllables,
coral/sky/lavender/mint/pink pigment, rough double contours, transparent background.
Project assets: src/assets/bloom-home-hero.webp and bloom-home-logo.webp.
Only resized/encoded for delivery; no automatic vector substitutes for the mascot.
Original generated PNGs preserved in generation output.

## UI boundaries
Real semantic buttons retain existing data-menu normal/sand/start/settings dispatcher.
Selected mode uses checkmark, border and color. Highest score uses existing recordBest;
no claim that it is a daily score. No new settings, no localStorage migration.
All styles are scoped through .cb-home; overlay/panel overrides require :has(.cb-home).
No .mode-art canvas, so legacy artwork loader cannot inject glass photographs.
Main 7 / CONTROL 18 / HOME 1.

## Verification
93 selected Node test entries pass, including the 15-case sand simulation script.
Controller comparison: only showMenu differs; input/update/scoring/saving/Adaptive unchanged.
Home generated files match src. Normal start/home/settings cycle preserves stored best,
settings and unrelated fields. Actual browser/mobile-frame inspection is a separate gate.
Public noindex QA surface: dist/qa/home-mobile.html (360×640, 390×844, 412×915).
Physical Android touch latency, heat and sustained performance require user device testing.

## First browser review and correction
All three embedded mobile viewports load both images and show CTA within viewport.
Measured CTA bottom: 558.7/640, 757.8/844, 828.9/915 pixels.
First review rejected excess separation between portrait and caption on tall screens.
Pass 2 enlarges the illustration slightly and groups the caption with it.
Two stale adaptive UI string assertions updated to already-shipped BLOOM/guide names;
19 related tests now pass. No adaptive rules changed.
