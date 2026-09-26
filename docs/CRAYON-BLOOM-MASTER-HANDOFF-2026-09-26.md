# CRAYON BLOOM — MASTER HANDOFF
Updated: 2026-09-26

## 1. Current product
- New working title: **크레용블룸 / CRAYON BLOOM**
- Repository: `owl920411-star/color-puzzle-game`
- Release principle: test changes away from MAIN first. Do not promote to MAIN until approved.
- Current theme branch: `codex/crayon-bloom-theme-v1`
- Theme branch starts from Adaptive V1 Stable commit `ddf2c78`.
- Active game modes: Normal and Sand. Infinite score play remains the product direction.
- The theme change is visual. Existing gameplay data and adaptive profile keys are intentionally preserved.

## 2. Locked gameplay baseline
- CONTROL 16: right-hand rail; large hard-drop button; HOLD → ROTATE → DROP order.
- Invisible board controls: short left/right touch = one cell; hold = continuous move; horizontal swipe = rotation; up swipe = hold; down swipe = hard drop.
- NOVICE 7 difficulty baseline stays unchanged during theme work.
- BLOCK ITEMS V2 stays active. Score-increase items remain removed.
- Adaptive Director V1 Stable stays active. Do not reset existing best scores or adaptive profiles because of a theme rename.
- Adaptive mode changes only future ground-rise intervals; it does not retune touch, NEXT, gravity, or curse timers.

## 3. Adaptive V1 state
- Stable diagnostics separate current-game diagnosis, previous-game result, and next-game settings.
- Diagnostic audit records risk detection, proposal, application/cancellation, excluded-sample reasons, and terminal path.
- Existing Stable work reported 96 focused tests passed; this is not a claim that every later theme commit has rerun the entire historical suite.
- Real phone feel/performance remains a hands-on verification item.

## 4. Confirmed CRAYON BLOOM art direction
The old desert/pyramid presentation is being replaced by a cute pastel crayon picture-book world.

### Core visual identity
- pastel crayon / colored-pencil hand drawing
- warm off-white paper feeling
- sky blue, pink, mint, yellow, lavender
- imperfect hand-drawn outlines; avoid glossy plastic/jelly rendering
- blocks must look hand-colored, with visible scribble strokes
- simple doodle marks inside blocks: star, heart, circle/flower, clover/cross-like doodles
- garden/sky/flowers/clouds as the normal-mode board environment
- cat and chick are supporting mascots, not gameplay requirements
- cute effects: crayon dust, petals, stars, hearts, doodle streaks
- important rule: effects must not delay input or obscure the next placement

### Name / copy
- Korean: 크레용블룸
- English: CRAYON BLOOM
- Product idea: small colorful blocks bloom into cheerful moments.
- Do not describe the game as an IQ test.

## 5. Theme V1 implementation
Theme branch changes:
- title/header/build label renamed to CRAYON BLOOM
- pastel paper-like UI palette
- right-side CONTROL 16 rail preserved
- Normal board changed from desert drawing to pastel sky + garden
- block palette changed to pastel blue/yellow/lavender/mint/pink/coral
- Normal block renderer changed from sandstone tile to rough crayon-like colored tile with hand-drawn doodle marks
- desert-facing visual labels are being softened into BLOOM/garden-facing presentation while internal mechanics remain compatible
- gameplay constants, scoring, Adaptive Director logic and stored profile keys are not intentionally changed

## 6. Removed / superseded directions
Do not accidentally restore these as current scope:
- Crack mode
- Water mode
- Bubble mode
- Daily challenge
- old 100-stage progression as the main game
- 3-minute mode
- score-boosting items
- old desert/pyramid visual identity for Normal mode
- old glass-only visual identity as the final presentation
Earlier experiments (color-combination puzzle, jelly pixel game, stage variants) are historical prototypes, not the current product.

## 7. Sand mode
Sand remains an active second mode. Its underlying sand simulation is not to be replaced during CRAYON BLOOM Normal-theme work. A later visual pass can bring its menus/outer chrome into the same crayon brand while preserving the sand behavior.

## 8. Release-polish priorities after theme approval
1. readability of active block / ghost / fixed blocks
2. item icon readability in NEXT and field
3. line-clear hierarchy: 1 line small, multi-line stronger, 4-line special bloom
4. hard-drop landing feedback
5. danger warning localized to top/bottom/curse source
6. sound/haptic polish
7. performance and thermal check on real Android device
8. pause/background/resume/storage reliability
9. release build without developer-only shortcuts
10. store assets, privacy disclosures, rights/name review, Android closed-test requirements if applicable

## 9. Test protocol
- First verify CRAYON BLOOM branding and hand-drawn block style on the preview URL.
- Then verify touch/hold/rotate/drop did not regress.
- Then play only a short normal-mode round; long survival testing is not required for the first visual approval.
- If visuals are approved, continue with item/effect conversion and Sand outer-theme unification.
- Do not keep retuning Adaptive V1 without a concrete observed issue.

## 10. Next checkpoint
Theme V1 is a visual integration checkpoint, not final release art. The key approval question is:
**Does the live game now feel like the selected hand-drawn pastel crayon theme, especially the blocks, rather than the old desert/glass theme?**
