# CONTROL23 actions baseline reconciliation

2026-09-30. No input implementation changed in this reconciliation.

The actions freeze expected a42d8a74… from commit 19cd4d4. Commit 1c4c06d (AUDIO2, 2026-09-28) changed the single lateral movement branch from direct run.move to the same run.move plus moveTone after successful movement. The current actions span is d8833af2…; no tap/swipe/hold timing, movement distance or rotation mapping changed in that branch. ac91dcd (AUDIO3) later removed the sound throttle outside the frozen actions span. The existing AUDIO6 runtime is preserved.

The prior baseline excluded an already deployed movement-feedback addition. It is now renewed for actions only, with the full five-span gate retained. Existing CONTROL23 short-swipe renewal and all other hashes stay unchanged. The audio integration test now requires successful movement feedback, rejects feedback for a blocked movement, and retains gameover verification. No test deleted and no timing/distance assertion weakened.

Required renewed gate: control23-freeze, control20-stability, pointer-button-guard, control19-hold, tutorial-app and audio-app, followed by scripts/test-rc.cjs. Actual results are recorded in RELEASE-QA-CLEANUP-1.md after execution. Automated regression cannot substitute for physical-device comfort.
