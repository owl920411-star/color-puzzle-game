# Recovery 1 — 2026-09-22

Base DEV: 3a2b8d5a217fadba3dcf38a737b27521cdcf870b.

The sand HTML no longer contained #rotate, but updateHUD still assigned $('rotate').disabled. Reproduced this startup TypeError and the persistent loading notice in local Chromium. Remove the stale lookup instead of adding a hidden dummy button. Keep rotation absent from sand input/help; glass rotation is untouched.

Preserve the successful 576-grain sack, Field simulation and immediate next-packet spawning. Fix second-finger rail input ownership and compatibility-click double drops. Scope delayed land events to their old packet. Resolve the pending clear before automatic gravity can overwrite its state. Keep the original board swipe distances, axis and fast-down thresholds unchanged.

Add an always-visible top link from sand to the common glass/sand lobby. The common app.js still contains both materials and is not edited. Do not auto-redirect a returned lobby. Update sand-route VERSION, its actual script URL in index.html and the sand script URL in sand-micro.html together using checked content hashes. Labels: MICRO SAND 1.3.1 / 글래스폴 · 복구 1.

## Executed verification
- Exact local originals matched fetched Git blob SHAs for sand JS/HTML, stages, route and index.
- Node syntax checks passed.
- tests/sand-recovery.test.cjs: 12 passed (removed DOM, HUD, 576 grains, immediate spawn, settling, natural landing, pending clear, real two-chain, hold, mass, stages, over).
- tests/entry-recovery.test.cjs: 6 passed (fixture-based routing, glass non-interception, progress isolation, cache URL hashes).
- Local Chromium/Playwright: 20 passed, including original failure reproduction, repaired startup, CDP two-touch swipe+drop, no extra drop on releases, keyboard/mouse, pause/retry, fast down, next packet, hold, DEV 100 and locking, recovery links, 360x640/390x844/412x915/1280x800 layouts, QA off by default.

## Scope and limits
Container networking and browser localhost navigation were blocked. DEV web opens failed. Browser checks injected the exact sand HTML/scripts into about:blank with query/localStorage fixtures. Real device performance, cross-navigation persistence, actual deployed mode-to-mode navigation and full glass-app browser execution were NOT verified here. Glass presence/start code was inspected in the repository, and routing leaves its clicks alone; do not claim that this is a full glass browser run. Cloudflare build status must be checked separately after updating DEV.

main baseline: 45b8e72b09183f5d7aae4a8d7f7cd62f1c922a1b. Only DEV is to be updated. No edits to engine.js, app.js, art.js, stages.js, style.css, Cloudflare configuration or stored progression schema.
