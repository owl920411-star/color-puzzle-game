# SAND POUR 2 — continuous input (2026-09-22)

## User request
Waiting for the previous sand to fall before adding another dose feels frustrating.

## Change
`dist/sand-micro.html` loads the new `dist/sand-flow.js`. A click creates an independent supply job and immediately advances the next color. Aiming, holding and pouring remain available while earlier supplies emit, fall or settle. Every job keeps its initial position, color, private RNG, and 576-grain budget. Inlet scheduling rotates fairly and only writes vacant cells; overlap may extend supply time but never creates or loses mass. A temporarily busy active inlet still accepts input. Pending jobs are capped at 48 as an exceptional backlog guard, not a normal per-turn wait.

The existing 180 ms clear flash freezes the pending grain snapshot to prevent stale-index deletion. Input is still accepted during it; newly requested supplies start emitting when that brief flash ends. Automatic cascades keep their multiplier; a new user dose starts a fresh multiplier sequence instead of farming an unlimited chain. Clear detection remains based on stable terrain after the accepted supplies finish, as before; local clearing during endless continuous input is not added in this update.

When a stage goal is met, stop accepting new jobs and drain already accepted jobs before the result screen. Pause freezes every job. Retry resets all jobs. Current-color display, active inlet markers, status text and help distinguish the next dose from earlier moving sand. Scores use `glassfall-v1.sandFlow`; prior scores and campaign progress are retained.

## Unchanged
MicroSand physics file blob `2f246f76bf9c49088a2160d7dd6e5b1a34374989` and stages blob `38b1c460a3377b269646e849694a012110e8e525` remain unchanged. Original sand-pour.js, sand-clump.html, glass mode, main, lobby and deployment configuration are not edited. The prior POUR 1 HTML is preserved as sand-pour1.html using its original blob.

## Executed checks
- Node syntax check for the exact new sand-flow.js.
- 32 Node regression tests in tests/sand-flow.test.cjs passed: concurrent input, independent fixed sources, next color, hold, clock remainder, mass conservation, overlapping supplies, 30/60/120-fps consistency, actual two-chain, pending-clear safety, gems, all 100 configurations, retry, goal-drain and backlog bound.
- 15 local Chromium/Playwright checks passed: startup, touch aim, three simultaneous sources, later supply while prior grains fall, hold, pause/resume, retry, exactly one supply per downward swipe, developer stage 100, restored stage locks, no overflow at 360x640 / 390x844 / 412x915 / 1280x800, no QA object without explicit qa=1.
- The uploaded JS blob must match the locally tested `60e49628e75a593ec154a0652b933e6e4968afe9`.

## Test limitations
Container network access and browser URL navigation are unavailable. Local tests used the MicroSand factory extracted from the connector-read source (no physics edits), and the exact fetched stages file (SHA verified). HTML/scripts were injected on about:blank. The query string and localStorage were fixtures, so cross-navigation persistence and deployed-page rendering were not verified. Screenshots show a real local browser run, not an image mockup. Physical Android/iOS performance and gameplay balance still need user testing. Cloudflare build status is checked separately after the DEV ref update.
