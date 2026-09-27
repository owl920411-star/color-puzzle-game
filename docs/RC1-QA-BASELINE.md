# RC1 active-runtime QA baseline

This baseline targets `dist/endless-app.js`, `endless-rules.js`, block items,
Adaptive, CONTROL23 and the single CRAYON BLOOM mode. It does not resurrect any
removed mode or stage UI.

## Repaired stale tests

- `adaptive-app.test.cjs`: removed a require of deleted `sand-micro.js`; replaced
  obsolete normal/sand switching with home/restart of the sole normal engine and
  Adaptive-session reset checks.
- `block-items-app.test.cjs`: removed unused fake MicroSand global.
- `main-runtime.test.cjs`: removed duplicate assertions for a removed sand update path.
- Shared input harness and CONTROL19/20 historical test filenames now exercise
  current CONTROL23 cadence; see RC1-CONTROL-FREEZE.md.

The following active non-home suites passed177 test entries before RC integration:
`adaptive-app`, `adaptive-bridge`, `adaptive-director`, `adaptive-stable`,
`block-items-app`, `block-items`, `bloom-items`, `main-runtime`.
CONTROL gate adds61 entries (including five frozen source spans).

## Historical files excluded from RC gate

These files are left as historical evidence, not repaired by adding removed modules:

| File | Reason |
|---|---|
| `entry-recovery.test.cjs` | retired sand recovery route and stage entry |
| `materials.test.cjs` | removed sand/water/jelly rules |
| `progression.test.cjs` | retired multi-material missions/mastery |
| `stages.test.cjs` | retired100-stage campaign |
| `ui.test.cjs` | retired `app.js`/stages/multi-material UI |
| `endless.test.cjs` | mixed old normal+sand suite with deleted module/hash dependencies |
| `engine.test.cjs` | old crack-propagation tutorial/scoring; not current normal scoring |

Normal gameplay scoring/rows/geometry remain covered by active real controller,
item transactions, Adaptive and CONTROL tests. Excluding historical tests does not
mean those old projects were validated or are part of RC. Avoid a broad
`node --test tests/*.cjs` claim for this mixed-history repository.

## Accelerated state soak — explicit limits

`node --test tests/rc-lifecycle-soak.test.cjs`

Uses the actual normal controller, engine, items, Adaptive and crayon FX in a
synthetic DOM/canvas/time harness. Virtual time advances in100ms increments.
It exercises real pointer callbacks, drop/HOLD/rotation, natural gameover, pause,
resume, home and new-game resets. No production input changes or restored modes.

| Simulated duration | Game sessions | Drops | Pause/home cycles | Max particles | Max repeat timers |
|---|---:|---:|---:|---:|---:|
|10min|50|599|9|68|1|
|20min|100|1199|19|68|1|
|30min|150|1799|29|68|1|

All3 tests PASS. After cleanup: repeat timers0, particles0, pointer owner null.
The stand-in node registry stayed at23 named elements +6 cached particle canvases
(29 total) across all durations. This is a bounded model registry, not a browser DOM
heap measurement. Unknown preferences, sound/haptic values and existing best were
preserved. No storage reset was used.

These simulated runs took approximately1.4/2.0/2.8seconds of host execution.
They are **not10/20/30minutes of actual browser or phone playback**. Browser FPS,
heap/memory growth, audio contexts, real main-thread stalls and Android touch feel
are **NOT VERIFIED** by this test. New RC presentation/audio/tutorial integration
requires its own combined browser verification and the user's Android assessment.
