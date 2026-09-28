# FLOWER APPROACH 10 — 2026-09-28

Base: 55bde5a964f1dc4c5682ebf967aff7bf34873272.

The user clarified that petals must visibly grow from the cleared block toward the viewer before falling. POP9 began falling immediately, making the brief size pulse hard to perceive. The burst now has two stages: 260–320 ms of progressive enlargement at the source height, followed by the existing downward shower. Scale grows smoothly from 0.55 to 2.0–3.2, stays at its final size during the fall, and never pulses back down. Petals remain face-on during enlargement; tumbling blends in after the approach. Total lifetime is 620–780 ms.

Exactly three petals still start at each cleared cell: 30 for one row, 120 for four. Mirrored side petals retain per-cell and whole-row horizontal balance. No upward travel. The isolated comparison page remains available with one/four-row and middle/bottom controls.

Validation: 30/30 targeted effect, block-colour and hold/control tests passed. Assertions now cover visible enlargement on every approach frame, no downward movement until approach completion, subsequent fall/tumble, balance, counts, particle cap and expiry. An actual Canvas storyboard at 0/80/160/240/320/400/480/640 ms was inspected. The comparison page's actual inline code and renderer were exercised in a VM with Canvas: one-row middle, four-row middle and four-row bottom all reached the expected counts and stopped their animation loop after expiry. git diff --check passed.

No game rules, input, audio, storage or palette changes. The existing hard-drop trail draw-order fix is retained. Prior full-RC failures remain unresolved; the full suite was not rerun for this visual change. Browser/Android appearance and frame rate NOT VERIFIED.

Effect cache: cb-flower-approach10; app retains cb-flower-front7.
