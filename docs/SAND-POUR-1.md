# SAND POUR 1 — 2026-09-22

User approved real MicroSand physics but disliked the large airborne clump. This DEV experiment changes supply only: choose a horizontal position, press Pour once, deliver 576 grains over 84 fixed physics ticks (about 0.7 s if unobstructed), lock the position until settling/cascades finish.

## Preserve the successful baseline
- `dist/sand-micro.js` is unchanged: blob `2f246f76bf9c49088a2160d7dd6e5b1a34374989`.
- New `SandPour.Run` uses the existing `MicroSand.Field` class, not a reimplementation.
- The dose is still 576 grains (4 units). Color sequence, grain collision, gravity, diagonal settling, four-neighbor groups, gem clearing, burst scoring and chain multiplier are retained.
- Initial free-fall timing and hard-drop bonus no longer apply: the player aims before pouring. This changes gameplay pacing; difficulty is not asserted equivalent.
- Scores live in `glassfall-v1.sandPour`; previous `sandMicro`, glass records and campaign data are not intentionally removed.
- The original page is retained byte-for-byte at `sand-clump.html` for comparison; its original physics/script still load.
- `main`, glass engine, lobby, route script, stages and Cloudflare config are not edited.

## Visible change
No clump, tetromino preview or rotation button. Current color/remaining amount and next two doses are displayed. Touch/drag or the bottom position slider selects a source. Pour button or a fast downward swipe confirms. Actual source rate/width tapers; these are real generated simulation grains, not a decorative trail. Stable grains do not randomly shimmer.

## Checks performed before committing
- `node --check dist/sand-pour.js`: pass.
- `node tests/sand-pour.test.cjs`: 21 tests pass, including exact dose mass, blocked inlets, hold, 30/60/120-fps determinism, real two-chain collapse, and all 100 stage parameters.
- Headless Chromium + Playwright: local source injected into a blank document because this runtime blocks URL navigation (including localhost). The local test core was extracted from the fetched unchanged MicroSand core. Original DOM controller is gated on `#sand-board`, which does not exist on the new page.
- Browser interactions verified: startup, touch aim, partial airborne grains, locked source/hold during pour, pause/resume preserving the field, exact completed supply, hold once, retry reset, developer access to stage 100, three colors and gem target.
- Layouts 360x640, 390x844, 412x915 and 1280x800: no document overflow. Screenshots are real local Chromium renders, not design mockups.
- Ordinary page does not expose QA. `?qa=1` provides read-only state/field diagnostics.

## Limits
No physical Android/iOS device test or deployed-page rendering was performed in this execution environment. Cross-navigation localStorage persistence was not verified by the blank-document browser test. Cloudflare delivery must be checked separately after commit. User feedback should focus on supply pacing, visible grains and loss of rotation—not changing the successful Field physics without cause.
