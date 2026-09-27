# CRAYON BLOOM ITEMS 1 — 2026-09-27
Base: main ee940c7681540e5e72ed02fbd6ffad14cc5aa42f (MAIN 5).
User confirmed CONTROL 18 double-movement and swipe-repeat issues resolved.

## Block items (3 good / 3 bad)
| Internal ID | Old name | New name | Preserved effect |
|---|---|---|---|
| oasis | 오아시스 수로 | 무지개 크레용 | Remove lowest occupied row after natural clear |
| sunburst | 태양 폭발 | 꽃송이 지우개 | Remove fixed blocks in original 3×3 neighborhood |
| spear | 호루스의 창 | 별빛 스티커 | Remove up to six fixed blocks below in same column |
| mummy | 미라의 붕대 | 삐뚤빼뚤 스티커 | Requires two completed rows; first removes only one layer |
| scarabCurse | 스카라베 증식 | 엉킨 크레용 | After 12 seconds, add one block to a safe adjacent cell |
| seal | 사암 봉인 | 먹구름 낙서 | After 15 seconds, turn at most two adjacent blocks into two-hit stickers |

Existing separate support inventory preserved, not counted as new block items:
시간의 모래시계 → 쉬어가는 구름 (delay rise 10 seconds, total cap 15 seconds);
태양의 부적 → 쓱싹 지우개 (bottom row);
호루스의 눈 → 미리보기 색연필 (next rise holes);
파라오의 망치 → 톡톡 도장 (bottom four rows, columns 4–6);
앙크 → 하트 반창고 (automatic top-four-row rescue on fatal rise).

## Presentation audit
Replaced names, glyphs, cached drawn badges, descriptions, NEXT/hold labels,
item announcements, toolbox, developer panel, rule text, adaptive diagnostic copy,
BLOOM level subtitles, amber atmosphere and retired gold CSS.
Removed unused pyramidProgress drawing and stopped loading legacy glass FX.
Historical documents, inactive legacy source/assets and internal IDs remain for compatibility.
Current entry point loads no legacy sand/glass shatter module.

## Boundaries and verification
Board operations below ITEMS metadata are byte-for-byte unchanged.
CONTROL 18 input block, update loop, emitNormal score calculation unchanged.
Engine, sand simulation, storage keys and adaptive decision policy unchanged.
Only adaptive explanatory strings changed; historical data is not migrated.
Six developer immediate-effect buttons run real board effects in excluded practice games.
The immediate scarabCurse fixture opens a supported adjacent cell so the effect is visible.
Effects share the existing capped 180-particle renderer; no input hooks/new animation loop.
120 selected tests pass, including 3,000 randomized board transactions and six immediate routes.
Six badges and particle shapes rendered with native Canvas for visual inspection.
Physical Android input latency, temperature and sustained frame rate still require device testing.

Build label: CRAYON BLOOM · MAIN 6 · CONTROL 18 · BLOOM ITEMS 1.
Code publication, CI/Cloudflare build success and physical phone verification are separate gates.
