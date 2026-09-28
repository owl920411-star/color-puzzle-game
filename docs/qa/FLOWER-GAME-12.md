# FLOWER GAME 12 — 2026-09-29 KST

Base: 08abd98ae3cd10fc7981892c6420ea224fea10f0.

The user approved the CAMERA11 effect in the isolated preview, but reported that actual game clears still lean left. This is a reproducible integration bug, not an effect-design change.

Root cause: endless-app.js fit() uses a 360×720 logical board but enlarges the canvas backing store to 720×1440 on DPR 2+ devices and sets a 2× drawing transform. The FX incorrectly read canvas.width as the logical width. On those devices it selected cameraX=360 rather than 180 and treated the board as 20 columns rather than 10. This shifted the projection left and broke mirrored-column motion weights. The preview has a fixed 360×720 backing store, so it did not exhibit the bug.

Fix: the FX owns explicit logical width and height, defaulting to 10×20 cells. Both the actual game and the preview pass the same 360×720 dimensions. Camera position, column pairing, culling and effect bounds use logical dimensions regardless of backing resolution. Approved artwork, motion curves, timing and particle counts remain unchanged. Both the effect and application cache keys are updated to cb-flower-game12.

Verification: an actual Canvas comparison at 200 ms and identical seed reproduced a size-weighted horizontal center of 94.834 on the old DPR-2 game, versus 180 in the approved preview. The corrected DPR-2 game returns exactly 180, and all projected positions, scales, rotations and sizes match that original preview. Before/after renderings were inspected. 37/37 targeted tests passed: the existing 31 effect, block-colour and hold/control tests plus six real-controller integration cases. The new cases run actual hard-drop-to-clear transactions and the actual preview-page script for one/four rows at DPR 1, 2 and 3, comparing artwork and complete projected motion across 50 frames. With the old FX loaded in memory, both DPR-1 cases pass and all four DPR-2/3 cases fail, confirming reproduction of this exact mobile bug. git diff --check passed.

Actual Android device interaction and FPS remain NOT VERIFIED. Full-RC tests were not rerun; previously recorded unrelated failures remain unresolved. No game rules, input, audio, palette or storage changes.
