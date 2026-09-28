# FLOWER SPRAY 8 — 2026-09-28

Base: 7cab99b09c1173c3489fd62853e5f45528fc2b43.

Reference: user-uploaded 10449.mp4, 16.603s. Extracted the burst around 14.10s at 30fps, inspected a 20-frame contact sheet and independent review. Visible detachment ~33ms, strong tumbling/forward burst ~70–140ms, rapid downward movement by ~160–230ms, most fragments gone by ~330ms with stragglers ~430ms. These are approximate visual observations, not tracking measurements.

The prior renderer mostly enlarged petals on the original row for ~1s. This revision keeps three petals per block and own-cell origins, but uses faster forward growth, near/far variation, faster tumbling and strong downward exit. Petal lifetime 360–460ms; opacity stays strong through most of the burst and fades near the end. No upward launch. Local sideways balance and full-row balance retained. Item motion, app/controls, block palette and the previous drop-trail colour fix unchanged.

Validation:
- 30/30 targeted FX, block-colour and control tests PASS.
- Updated duration/descent checks to match this reference; exact counts, origins, simultaneous start, no upward travel, horizontal balance, lifecycle and control checks remain.
- New dispersion check prevents a single moving horizontal strip.
- Actual renderer storyboard inspected at 0/33/67/100/166/233/333/433ms.
- New isolated dist/qa/flower-preview.html uses the live renderer; one-/four-row buttons and middle/bottom positions. Actual-canvas VM exercise verified 30/120/120 peaks, expiration and frame-loop completion. This is not full browser UI verification.
- Prior full-RC failures (9) remain unresolved; full RC suite not rerun. Browser/Android feel and FPS NOT VERIFIED.

Effect cache key: cb-flower-spray8. App remains cb-flower-front7.
