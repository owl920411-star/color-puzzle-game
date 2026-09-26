# MAIN 2 — frozen legacy link and duplicate touch recovery

## Observed causes
The distributed DEV link still tracked c8ecf9f while MAIN was 83da419. DEV's endless-app.js blob 4e79cef63de922f4234e9a8e2e3afcb4aabdaf49 still references the removed mascotTime variable. MAIN's app blob ba909168070153f3389162b5a3e0c92d4a1c6a40 does not. MAIN-first policy by itself did not repair the earlier URL.

The MAIN Pages artifact 10908058052 was downloaded and extracted. Its full app blob was checked against MAIN. Reintroducing the single dangling condition reproduced the exact DEV blob hash. Running the full old app in Chromium freezes its clock at the first playing frame, raises ReferenceError, and leaves newly locked cells invisible because frame() never gets to draw() or schedule another frame. This is stronger evidence than the earlier excerpt-only test, but not a direct live-URL reproduction.

A second issue was observed using Chromium's mobile touch input: one tap sends pointerdown and then click(detail=0, pointerType=touch). Both were treated as actions. A drop tap locked TWO tetrominoes (8 cells), and a rotation button could rotate twice. The new pointer-button-guard filters only these physical followup clicks on action buttons; ordinary mouse, keyboard and nonpointer accessibility activations remain usable. There is no time debounce and no change to swipe thresholds, engine, scoring, gravity or layout.

## Change and compatibility plan
MAIN 2 loads the small guard before the unchanged fixed MAIN app and uses fresh cb-main-2 asset URLs. The visible build is CRAYON BLOOM · MAIN 2 · CONTROL 17; the button is 쏙!.

After MAIN is committed, the old DEV ref may be fast-forwarded ONCE to the same recovery commit so previously distributed links are no longer left frozen. This is legacy-link repair, not a return to DEV-first development. No history is deleted, no force push is used, and browser stored data is not cleared or moved between origins. Future development remains on MAIN.

## Actually executed verification
Focused Node tests: adaptive-director, adaptive-bridge, adaptive-stable, main-runtime and pointer-button-guard. Total 117 passed / 0 failed. These are the current 96 focused adaptive tests + 12 runtime tests + 9 new input guard tests, NOT the unrelated historical 117-test claim.

Full-app Chromium checks used all bundled runtime scripts, real Normal/Sand engines, actual DOM, canvas and animation frames. Because network navigation (even local HTTP navigation) is blocked by this environment, scripts and CSS were loaded into about:blank?qa=1 and localStorage was represented by an in-memory Map. Optional legacy image requests and live hosting are not certified by this test.

Observed after the repair:
- Four normal-mode finger taps: exactly 4, 8, 12, 16 fixed cells; timer and next-piece generation continue.
- Natural normal gravity reaches the floor, locks a piece and spawns the next without button input (22.5-second real-clock observation).
- Sand: natural fall, four taps, one packet per tap, grains accumulate and the game continues.
- Rotation button: one touch, one rotation. Horizontal/down swipes act separately. A second-thumb drop cancels the pending board rotation and locks exactly one block.
- Pause/resume, restart, existing item line-clear transition, mouse, Enter and nonpointer activation checked.
- Existing best-score and unrelated saved keys preserved in the storage stand-in.

Some combined browser batches reached this environment's process time limit; observations above were checked in separate runs as well. Do not describe that combined launcher as a clean all-tests run. The original packaged historical test sweep gave 190 pass / 45 fail (including obsolete UI expectations and missing legacy package files). Those tests were not deleted or weakened, and are not represented as release-ready.

Deployment checks and downloaded deployment artifacts must be inspected separately. A Cloudflare success check alone is not proof of real-device gameplay. Never invent a Worker hostname. The existing GitHub Pages deployment job explicitly reports https://owl920411-star.github.io/color-puzzle-game/ as its environment URL; its root routes to dist/.
