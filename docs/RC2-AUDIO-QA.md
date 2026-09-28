# CRAYON BLOOM RC2 — AUDIO 1

## ROOT CAUSE

Baseline main: `ebc8a9a50837e7029e041e652d62ca53bc65e73d`.
Production: https://owl920411-star.github.io/color-puzzle-game/dist/

Confirmed in the old Production first-install QA fixture: empty storage rendered master OFF with BGM/SFX ON. `BloomAudio.stats()` reported `sound:false`, `bgm:true`, `sfx:true`, `unlocked:false`, `contextState:unavailable`, `contextsCreated:0`, `scheduled:0`. START completed loading and entered the tutorial without creating an audio context. Moving focus to the parent diagnostic controls then paused the game; no voices had ever been scheduled.

Confirmed in source: module master default was false; configure converted an absent sound value with Boolean(), producing false. The application had no fill-missing audio migration and displayed independent toggles without indicating master suppression.

Gesture assessment: the baseline already had a capture-phase document pointerdown unlock. Therefore asynchronous loading alone is NOT established as the cause of the user's Android silence. However START click did not itself unlock before awaiting loading, and unlock only called sync(), which did not resume in paused scenes and could be blocked by an earlier pending resume. Those paths are now hardened. The user's exact Android stored values and autoplay behavior remain unobserved.

## FIX

- `src/bloom-audio.js`, `dist/bloom-audio.js`: missing master defaults ON; direct synchronous resume request inside unlock even in paused/loading scene or after a pending policy-blocked request; one context retained. Add musicScheduled, effectsScheduled, effectEvents and effectVoices diagnostics.
- `dist/endless-app.js`: fill only absent sound/bgm/sfx keys; START and menu click invoke configure/unlock before loading; master-OFF subcontrols are disabled and explicitly say they are suppressed while preserving their saved choices.
- Release metadata/cache keys and HOME footer: AUDIO 1 suffix. No design styling or asset changes.
- Tests and isolated audio QA page: real engine/controller actions plus Web Audio scheduling diagnostics. QA storage is replaced with memory before app boot; it never clears real localStorage.

## DEFAULT / MIGRATION

New users: Sound ON / BGM ON / SFX ON. Absence means ON. Explicit false remains false, including legacy false without any provenance marker: do not infer whether it was an old default or an intentional choice. Only missing keys are added. Best scores, tutorial state, sensitivity, Adaptive data and unknown fields remain intact. If storage writing fails, defaults still work in memory. No storage reset.

## QA

Baseline existing suite: 295/295 PASS.
Final suite: 312/312 PASS (295 existing + 17 new audio application tests).
Command: `node scripts/test-rc.cjs`.
All five frozen CONTROL 23 hashes PASS without updating the expected hashes.

Tests cover new storage, missing master, explicit master true/false, BGM false, SFX false, setting display/storage agreement, retained unrelated data, START gesture before deferred loading, cancelled loading, pending-resume retry, HOME/GAME/PAUSE/RESUME/background lifecycle, and real rotate/hold/drop/clear/combo/good/bad/gameover events scheduling effect voices. Ordinary lateral movement remains silent. Existing audio tests also cover voice caps and 30 minutes of virtual scheduling.

Audio QA: https://owl920411-star.github.io/color-puzzle-game/dist/qa/audio.html?qa=1&case=new

Production browser QA after successful Pages deployment (Chrome, not Android listening):

- First-run START: sound/bgm/sfx true, unlocked true, contextState running, scene game, contextsCreated 1, scheduled 52, dropped 0.
- HOME return: running, scheduled 288. GAME: running, scheduled 331. PAUSE: suspended, voices 0. RESUME: running, scheduled 396; one context throughout.
- Real event effect voices: rotate 2, hold 2, drop 2, clear 4, combo 3 per combo (two combos in the fixture), good 3, bad 3, gameover 4. No dropped voices in these samples. These use the actual engine/controller with QA board fixtures, not direct effect() invocations.
- Existing master OFF: remains false after START, zero contexts and scheduled voices; BGM/SFX retain true but settings visibly disable them and explain suppression.
- Existing ON: running; musicScheduled 15, effectsScheduled 4. Missing master: running; musicScheduled 18, effectsScheduled 4.
- BGM OFF: musicScheduled 0, effectsScheduled 4. SFX OFF: musicScheduled 18, effectsScheduled 0.
- Preserved best 123, tutorialCompleted and qaPreserved fields in all legacy browser fixtures.
- Resume diagnostics observed real user activation true. START direct gesture ordering and retry after an unresolved policy-blocked promise additionally pass the automated tests.
- Visibility hide/show suspend + interaction recovery is covered by the real audio module with simulated visibility in the regression harness. Physical Android app switching remains NOT VERIFIED.
- Canonical Production footer independently reloaded and confirmed AUDIO 1.

Evidence: `qa/audio/browser.json`, `qa/audio/master-off.jpg`, `qa/audio/automated-tests.txt`.

## ANDROID / VOLUME

Android physical-device listening remains NOT VERIFIED. Browser running state and scheduled voices are not proof of audible speaker output. User must verify HOME and GAME BGM, event SFX, resume after app switching, and practical volume on Android Chrome. Existing gain values remain master 0.64 / music 0.30 / effects 0.65. No unmeasured volume boost or composition change.

## PROTECTED

CONTROL 23 FINAL unchanged: long press 165ms, repeat 38→33→29ms, tap/swipe/HOLD/DROP/multitouch and race cancellation guards. VISUAL RC2, game rules, tutorial, combos, item behavior and BLOOM unchanged. Only audio UI status and release identifier changed.

## DEPLOY

Code commit: `19cd4d4b1079b34e9324c56ef1c71e10d02ca3b3`.
Pages deployment: SUCCESS. Run: https://github.com/owl920411-star/color-puzzle-game/actions/runs/36375342655
Screen: `CRAYON BLOOM · RC2 · CONTROL 23 FINAL · HOME RC2 · AUDIO 1`.
