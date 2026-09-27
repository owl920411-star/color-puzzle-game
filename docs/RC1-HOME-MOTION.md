# RC1 · Phase 5 home motion

The existing paper layout, logo, official baby-and-chick illustration, text, start action, settings and record placement are unchanged. Entrance motion uses only finite CSS transform/opacity animations. No JavaScript animation timer, requestAnimationFrame loop, image decoder or interaction gate was added.

## Sequence

| Element | First entrance starts | Duration |
|---|---:|---:|
| Paper | 0 ms | Already visible |
| Logo/heading | 100 ms | 220 ms |
| Official baby + chick scene | 250 ms | 300 ms |
| Scene caption | 450 ms | 220 ms |
| Short play hint | 550 ms | 220 ms |
| Record/settings/footer | 650 ms | 220 ms |
| Real start button | 750 ms | 220 ms |

Total first sequence: 970 ms. The official baby and chick are one approved illustration, so they enter together instead of distorting or duplicating the chick. No new decorative characters or motion loops are introduced.

A module-local render flag switches later home openings in the same page session to 40% of these delays/durations, completing in 388 ms. Reloading the page starts the complete short sequence again. No save data is added or changed by this choice.

The real start button is present and enabled from render time. Pointer input is never blocked by the entrance. Focusing or pressing the button cancels its reveal animation, showing it immediately. `prefers-reduced-motion: reduce` disables all home entrance animations entirely.

`animation-fill-mode: backwards` avoids persistent transform ownership after completion; the original button/caption rotations and press states remain authoritative. No layout dimensions are animated. Removing/hiding the home cannot leave a JavaScript animation loop behind.

## Gate

- Home asset and saved-record checks: pass.
- Source/distribution equality: pass.
- First/return state and immediate real start action at time 0: pass.
- No home presentation timer creation: pass.
- CONTROL FINAL frozen spans: pass.
- Browser and 360×640/390×844/412×915 visual checks belong to the integration/Release QA gate; these code checks do not claim device inspection.
