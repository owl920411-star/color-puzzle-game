# FLOWER CAMERA 11 — 2026-09-29 KST

Base: 7a7411aa4e2ee3cc1c1cdf8bd9f1b0c4630d8c3a.

The user rejected APPROACH10: scaling about each particle's own source, with a frozen height and angle, read as inflation rather than flight toward the screen. They also preferred the first flower artwork.

The burst now moves through depth and projects through a shared camera. The screen positions separate outward as size increases; this motion is mirrored around the board center. Mild downward drift and rotation continue during approach, followed by the stronger gravity-driven fall. There is no upward launch or stationary expansion stage. Near flowers and smaller petal accents use different depths, creating visible size and overlap differences. The camera's outward displacement is compressed for the narrow game board; some outer flowers naturally cross the canvas edge.

Artwork restoration: the original sprite function from FLOWER BURST 1 is unchanged. One original five-lobed flower with a yellow center and two smaller original petals now emit from each cell. Previous iterations had removed the whole flowers and magnified only leaf-shaped petals. Source colors, outline, texture and palette are preserved. Count stays exactly three per cell, 30 for one row and 120 for four; lifetime stays under 800 ms and the particle cap stays 180.

Validation: actual Canvas storyboards for one and four rows were inspected across 0–640 ms. The actual comparison-page inline script and renderer ran in a VM with Canvas for one/four rows at middle/bottom positions; counts were correct and all animation loops ended. 31/31 targeted effect, block-colour and hold/control tests passed. Effect checks include shared outward motion, original sprite mix, distinct visible depth layers, global balance, no upward launch, source counts, bounds and expiry. git diff --check passed. This does not verify Android appearance or frame rate; the user must judge the intended depth impression in the linked preview. Full-RC tests were not rerun, and previously documented unrelated failures remain unresolved.

Only the FX, its targeted tests, and effect cache keys changed. Controls, gameplay, audio, palette, storage and the existing hard-drop trail colour fix are retained. Effect cache: cb-flower-camera11; app cache remains cb-flower-front7.
