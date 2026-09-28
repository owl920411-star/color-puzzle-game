# FLOWER POLISH 6 — 2026-09-28

Base: b6d4359983f728797b4065ef12b11cd8cd60bdc1.

Preserves exactly three simultaneous petals per cleared cell and per-cell projection origins. Fixes the repeated comb-like motion by varying adjacent cells' size, lift, rotation, tumble phase and lifetime. Mirrored columns share motion weight, and each cell retains a balanced side pair. Variation is computed only at emission.

Depth now eases analytically toward a limit instead of abruptly clamping. Maximum scale is about 2.56 rather than 3.83; tumble is slower with a minimum visible face width. The offset duplicate sprite is removed. Petals launch higher with lower gravity so bottom-row clears remain visible, then fade earlier and smoothly. No app/control/audio/rule/storage changes. Particle cap remains 180.

27/27 targeted effect/control tests PASS. Existing exact-count/origin, simultaneous-start, per-cell/no-global-drift, reset/lifecycle and control timing checks remain. Growth/tumble expectations reflect the intentionally smaller/slower motion. A new regression checks neighboring-cell variation and smooth non-clamped depth. Actual renderer inspected at 100/260/560ms plus a fixed-seed bottom-row sequence at 60/140/260/430/660/850ms. Independent code review identified synchronized motion, clamped growth and bottom-edge clipping and informed these changes.

Full browser and Android feel/FPS remain NOT VERIFIED. Prior nine full-RC failures remain unresolved; full suite not rerun for this isolated renderer polish. Cache key: cb-flower-polish6.
