# FLOWER FRONT 7 — 2026-09-28

Base: 6a1d2255e408019378e1a339874a379bfd4b73ab.

User correction: petals must spray straight toward the viewer, not jump upward. Keeps exactly three petals at each cleared cell. Initial vertical velocity is zero, with no vertical motion during the first 260ms; only slight downward settling after that. Perspective growth is faster. Per-cell origin, balanced sideways spread, varied rotation and counts remain.

Block-colour investigation:
- Palette and tile renderer match pre-effect a50d75c. The screenshot's pale L blue (#9fd8f6) differs intentionally from I blue (#77c9f4); a recent palette regression was not established.
- Confirmed independent bug: mint hard-drop streaks were drawn over solid blocks for 170ms, with overlapping vertical streaks washing out the colour.
- Fix: draw those streaks behind locked and active blocks. Only rendering order changed; action/input/rules unchanged.
- Actual controller rendered with @napi-rs/canvas: sampled dropped I-block pixel changed from [161,229,242] immediately to [115,196,242] after expiry before the fix. After the fix, both are [115,196,242]. The new dependency-free draw-order regression fails on original source and passes on patched source.

Validation:
- Targeted effects, block colour and existing control tests: 29/29 PASS.
- Full RC suite: 321 total / 312 PASS / same 9 pre-existing failures (audio, version/source/fixture and existing action-freeze mismatches). Not full RC approval.
- Added forward-only trajectory checks: no upward movement; first 250ms stays at launch height; scale >1.9 after 200ms; late downward displacement <15px through 800ms.
- Actual effect canvas alpha/transform restored after 60 frames; bottom-row effect frames inspected at 60/140/260/430/660/850ms.
- Browser and Android feel/FPS: NOT VERIFIED.

Cache keys for effect and app: cb-flower-front7. Audio, palette, game rules, controls and saved settings preserved.
