# RC1 · Phase 2 surface audit

Baseline: `b9f6904e2c8dbd1ca33f554c6350a68545043acb` (MAIN 9 syntax repair after sand removal). Phase 1 CONTROL gate is recorded separately in `RC1-CONTROL-FREEZE.md`.

## Findings and changes

1. `src/bloom-home.js` predated sand removal and would restore the sand menu on build. Synchronized source to the live single-mode `dist/bloom-home.js`. Updated the home regression to enforce one real start button, no mode selector, and source/output equality.
2. Production loaded `art.js`, which eagerly fetched about 2.6 MB of obsolete glass/jelly/crystal/design reference art, though no current crayon renderer used it. Removed the production script include and unused `glassartready` listener. No new compatibility layer.
3. Canvas background still drew a circular placeholder baby and chick. Removed those placeholder drawing blocks and the tiny secondary placeholder cat. The paper/flower background and block renderer remain unchanged. CSS placeholder mascots were already hidden by WORLD 2 hotfix; they remain inert historical CSS.
4. `dist/control23.html` referenced removed `sand-micro.js`. Replaced the alternate game document with a direct redirect and accessible link to canonical `index.html`.
5. Renamed the user-visible diagnostic export to `crayon-bloom-adaptive-diagnostic.json`. Storage keys and report schema did not change.
6. Changed redundant single-mode settings labels and home-return wording. Updated stale CONTROL 18 developer copy to CONTROL 23 final candidate. Item rule headings use product language instead of the development version name.
7. Replaced the obsolete GLASSFALL README with the actual single-mode product, controls, build ownership, storage and verification information.

## Current items and visual identity

The six block items already have CRAYON BLOOM names, hand-drawn icons and crayon effects. No item logic change was required:

- `oasis`: 무지개 크레용; erase the lowest occupied row after line completion.
- `sunburst`: 꽃송이 지우개; erase fixed blocks around the original cell in a 3×3 area.
- `spear`: 별빛 스티커; erase up to six fixed cells below in the same column.
- `mummy`: 삐뚤빼뚤 스티커; two-layer clear obstruction.
- `scarabCurse`: 엉킨 크레용; after 12 seconds add one safe adjacent block.
- `seal`: 먹구름 낙서; after 15 seconds turn up to two neighbors into layered stickers.

The five support tools remain 쉬어가는 구름, 쓱싹 지우개, 미리보기 색연필, 톡톡 도장, 하트 반창고. No direct-score item exists.

## Assets

`src/assets/bloom-home-hero.webp` and the identical distribution asset are 1000×750 transparent images, about 400 KB. The hero was generated from the user-approved uploaded mascot reference in HOME 1; thick dark curls, peach skin, rosy cheeks, pink hoodie and wax-crayon texture are preserved. The yellow chick is embedded in the same illustration. `bloom-home-logo.webp` is the corresponding 900×320 hand-drawn Korean wordmark, about 128 KB.

At this Phase there is no separate chick or cutin image. Phase 3 owns additional official-identity cutin assets and their provenance. No CSS or canvas primitive character is accepted as the official mascot.

## Active vs historical files

Production uses `engine.js`, `endless-rules.js`, `block-items.js`, `bloom-item-art.js`, `crayon-bloom-fx.js`, the three Adaptive modules, `pointer-button-guard.js`, `bloom-home.js`, `endless-app.js`, `endless.css`, `bloom-home.css`.

Not loaded by the production entry: `app.js`, `style.css`, `stages.js`, `progression.js`, `art.js`, `glass-shatter-fx.js`; old glass/jelly/crystal/design-sheet assets. They remain in the repository for history, not as selectable games. Prior docs/test fixtures include superseded modes and are not authority for current behavior.

The shared engine still contains old material branches and exported names. Current NormalGame depends on the same engine. No broad engine extraction or compatibility recreation is done in RC cleanup.

## Intentionally retained internal names

`GlassEngine`, `glassfall-v1`, `glassfall-adaptive-v1`, `desert`, `DESERT_LEVELS`, `DESERT_ITEMS`, `desertSurvival`, `drawPyramidBackground`, `pyramidTile`, item IDs and support-tool IDs are internal identifiers. Preserving them protects saved records and behavior. They are not user-facing item names or artwork.

## Validation

- Syntax check: `node --check dist/endless-app.js`.
- Home/source equality, six immediate item effects and CONTROL freeze: 17 tests passed after cleanup.
- Surface regression covers canonical assets, alternate route, non-exposure of removed mode, rendered menu/settings/dev/toolbox copy, diagnostic filename and removal of primitive mascots.
- Frozen `clearInput`, touch/buttons, actions, keyboard and replacement-carry spans remain byte-identical to the Phase 1 baseline.
- No claim of physical-device verification is made here. RC version/cache labels are unified in the final integration Phase, not inferred from this baseline.
