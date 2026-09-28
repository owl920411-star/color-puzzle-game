# FLOWER BALANCED 3 — 2026-09-28

Base: 8fec9fb7c788424abcadc4b22b5b4e1acfaebcea.

Line-clear particles now emit in mirrored pairs around the board center. Each pair shares size, depth speed, gravity, lifetime and face tumble, with mirrored horizontal motion/spin and source-cell colors. This removes random foreground weight bias while preserving the forward projection. No controls, audio, rules, scoring or saved settings changed.

Validation: 24/24 targeted effect and control tests pass. New regression checks the visible size-weighted horizontal center across 60 frames for one-, two- and four-line bursts. Actual renderer inspected at 100/260/560ms. Existing full RC baseline has nine known failures; not claimed resolved or revalidated by this focused change. Full browser/Android feel and FPS remain unverified.

Cache key: cb-flower-balanced3.
