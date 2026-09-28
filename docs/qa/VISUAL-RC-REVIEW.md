# CRAYON BLOOM VISUAL RC REVIEW

## 판정과 기준

**상태: VISUAL RC2 브라우저 QA 및 Production 확인 완료. Android 실기기는 NOT VERIFIED.**

- 기준 main: `28036e15809a0269bd55a83dea15f5b352ea7e33`
- 기준 버전: `RC1 · CONTROL 23 FINAL · HOME RC1`
- 후보 버전: `RC2 · CONTROL 23 FINAL · HOME RC2`
- 검수 순서: 첨부 `RC1-RELEASE-QA.md` → 최신 main → 실제 GitHub Pages → 수정.
- 과거 개발 과정/폐기 기획을 복원하지 않았다. 현재 RC1의 기능과 구조를 기준으로 했다.
- 본편 URL: https://owl920411-star.github.io/color-puzzle-game/dist/
- 격리 검수 URL: https://owl920411-star.github.io/color-puzzle-game/visual-review/qa/visual-gallery.html
- 검수 경로는 실제 배포된 후보 런타임을 사용하며 본편 저장과 별개의 메모리 저장을 사용한다.

[HOME/GAME 나란히 보기](visual/before-after.jpg) — 동일 390×844 캡처를 잘라 배열한 비교 이미지. 색과 화면 내용은 수정하지 않았다.

## 1. BEFORE에서 확인한 프로토타입 원인

|항목|실제 화면 문제|이번 결정|
|---|---|---|
|구성·위계|HOME 설명 3개가 로고 → 캐릭터 → 시작 사이를 끊음|설명 축소, 주요 장면과 CTA 연결|
|여백|설정의 긴 규칙이 주요 옵션을 밀어냄|옵션 우선, 규칙은 펼쳐보기|
|버튼|짙은 기존 gradient와 낮은 대비, 행동 위계가 약함|채색 primary / 종이 secondary / 밑줄 tertiary|
|글꼴|그림 로고와 시스템 UI의 이질감|짧은 손글씨와 읽기 쉬운 본문·숫자 분리|
|아이콘|pause/회전/drop의 서로 다른 Unicode 모양|같은 두께의 선형 SVG|
|게임판·블록|푸른 gradient와 광택 테두리가 크레용과 충돌|따뜻한 도화지, 무광 덧칠 블록|
|배경·패널|다색 배경, blur, 여러 카드 표면이 웹 테마처럼 보임|낮은 대비 종이, 얕은 그림자, 공통 외곽선|
|캐릭터|성공에도 같은 중립 그림, 결과·pause의 감정적 연결 부족|공식 축하 포즈 1개와 병아리의 역할 분리|
|모션·전환|RC1의 안정적인 시간 체계와 별개로 시각 표현이 분산|크레용 선과 작은 꽃/별의 공통 표현|
|결과|결과 행들이 비슷한 강도로 나열됨|점수 → BEST → 세부 → 다시 하기|
|튜토리얼|숫자 단계 표시와 일반 안내창 느낌|숫자 표시 숨김, 종이 메모·손글씨 안내|
|설정|큰 웹 버튼과 긴 설명|소리/느낌/도움 그룹, 손그림 체크|

## 2. 디자인 시스템

|요소|통일 기준|
|---|---|
|종이|`--paper #fff8e9`, `--paper-warm #f5ebd7`|
|잉크|`--ink #493c38`, `--ink-soft #756459`|
|색|pink `#a94869`, blue `#527f95`, yellow `#edc666`, mint `#729d83`, purple `#8974a1`|
|외곽선|미세하게 다른 모서리, 종이/크레용 이중 선; 과장된 울퉁불퉁 효과 없음|
|그림자|낮은 2×3px 종이 그림자; 큰 웹 카드 그림자 제거|
|질감|작은 정적 SVG 무늬. 실시간 turbulence/filter/noise 생성 없음|
|폰트|Gaegu Bold: 짧은 브랜드/행동. 본문: 읽기 쉬운 sans. 숫자: 명료한 숫자체|
|버튼|primary만 진한 크레용 pink. 보조는 종이. 홈/뒤로는 밑줄|
|모션|버튼 120ms, panel 220ms, 꽃/별 500ms. HOME 970/388ms와 RC1 컷인 수명 보존|
|레이어|board/HUD/FX/mascot/tutorial/modal 구분. 장식은 pointer-events:none|

[대비 계산](visual/contrast.json): 기본 잉크 9.99:1, 보조 본문 5.33:1, primary 글자 5.20:1, 결과 점수 6.73:1, 쏙! 7.11:1. 이미지 로고와 장식은 본문 대비 판정 대상과 구분했다. 실제 캡처에서도 질감이 본문을 덮지 않는지 확인했다.

## 3. HOME — BEFORE → AFTER

[BEFORE](visual/before/home-all.jpg) → [AFTER](visual/after/home-all.jpg)

중복 설명을 덜고 로고, 공식 아기+병아리, 시작하기를 중심으로 정리했다. 로고 밑과 시작 버튼 위의 짧은 크레용 선이 같은 표지 안에 연결된다. 시작 버튼은 진한 채색과 이중 외곽선으로 정지 상태에서도 우선순위가 분명하다. 최고점/설정은 보조 위치를 유지한다. 원본 마스코트의 얼굴과 HOME 자산은 교체하지 않았다.

390/412 화면에서 hero 이미지의 투명 영역 및 가장자리 장식이 종이 밖으로 bleed한다. 자동 geometry는 이를 VISUAL REVIEW로 표시했다. 캡처에서 얼굴·손·병아리 및 주요 버튼이 잘리지 않는 것을 별도로 확인했다. 자동 검사 예외를 자동 PASS로 바꾸지 않았다.

## 4. GAME — 구조 보존, 표현 변경

[BEFORE](visual/before/game-all.jpg) → [AFTER](visual/after/game-all.jpg)

|요소|변경|
|---|---|
|게임판|채도가 높은 하늘 배경 → 밝은 도화지와 매우 낮은 대비 구름/선|
|블록|광택 gradient → 무광 채색, 6개 덧칠 stroke, 조금 비정형인 외곽. 색·셀 경계·기존 문양 유지|
|NEXT/NEXT 2/HOLD|위치와 preview 크기를 유지한 작은 메모지 표면|
|점수|동일한 카드 나열 → 손글씨 라벨·명료한 숫자·가벼운 밑줄|
|BLOOM|기존 레벨 상태로 작은 꽃이 커짐. 별도 진행 로직 없음|
|쏙!|기존 터치 영역 유지, 노란 채색과 같은 선형 아이콘|
|PAUSE/회전|기존 버튼 유지, 손그림 선형 SVG로 통일|
|위험|기존 위험 판정 유지. 공격적인 주황 경고를 코랄 선으로 낮춤|

[BEFORE geometry](visual/before/geometry.json)와 [AFTER geometry](visual/after/geometry.json)의 topbar, scorebar, board, rail, HOLD, DROP 좌표·크기는 세 크기 모두 일치한다. `fit()`은 변경하지 않았다. 10×20, NEXT/HOLD/쏙! 배치는 그대로다.

[BLOOM 360](visual/after/bloom-360.jpg) · [390](visual/after/bloom-390.jpg) · [412](visual/after/bloom-412.jpg) · [DANGER](visual/after/danger-all.jpg)

## 5. 공식 마스코트와 정식 자산

|화면|역할|
|---|---|
|HOME|기존 공식 아기+병아리가 표지의 중심|
|LOADING|같은 공식 아기와 짧은 동행|
|TUTORIAL|성공 때 기존 병아리/체크, 완료 때 기존 공식 아기. 상시 큰 캐릭터 없음|
|2 COMBO|기존 공식 병아리|
|3+/4 LINE|공식 기준으로 만든 행복한 아기+병아리 포즈|
|NEW BEST|행복한 포즈와 점수 옆 작은 별|
|GAME OVER|기존 중립 공식 아기+병아리. 과장된 울음/실패 표현 없음|
|PAUSE/SETTINGS|작은 병아리로 같은 그림책의 페이지 연결|

공식 기준 이미지를 먼저 확인한 후 이미지 생성으로 **축하 variation 1개만** 제작했다. 곱슬머리·얼굴 비율·분홍 후드·크레용 질감을 유지하고, 크레용을 든 팔과 표정만 바꿨다. 480×360 WebP, 61,574 bytes. 불필요한 포즈 수를 늘리지 않았다.

생성 지시: “Preserve the exact official baby identity, dense dark curly hair, dark almond eyes, face proportions, warm skin, pink cheeks, pink hoodie and coloured-pencil/crayon linework. Change only expression and pose to a delighted smile, holding the pink crayon slightly aloft, hugging the same happy yellow chick. Remove surrounding decorations. Compact waist-up composition, transparent background, no text or new characters.”

새 SVG: paper-grain, crayon-stroke, paper-star, paper-flower. 주요 UI에 임시 이모지/placeholder 없음.

Gaegu: JIKJI SOFT, SIL Open Font License. https://github.com/google/fonts/tree/main/ofl/gaegu / https://googlefonts.github.io/korean/ . 자체 호스팅 subset WOFF 198,824 bytes, `assets/fonts/OFL.txt` 포함. 새로운 package dependency 없음.

## 6. COMBO / 성공 연출

기존 이벤트·SFX 호출·cooldown·입력 구조는 그대로 사용한다. 기존 label의 의미는 보존하면서 Gaegu lettering, 밑줄, 정식 축하 포즈로 바꿨다. 별/꽃/하트는 기존 12개 재사용 pool이며 증가시키지 않았다.

|이벤트|BEFORE → AFTER|캐릭터/글자/선|수명·입력|
|---|---|---|---|
|2 COMBO|일반 label → 손글씨 메모|병아리 / 좋아! / pink 크레용 선, 적은 marks|기존 820ms, 입력 차단 없음|
|3 COMBO|중립 HOME 그림 → 축하 포즈|아기+병아리 / 멋져! / 크레용 선|기존 820ms, 입력 차단 없음|
|4+ COMBO|같은 중립 그림 → 행복한 반응|아기+병아리 / BLOOM! / 꽃·별·하트|기존 820ms, 입력 차단 없음|
|HIGH COMBO|큰 generic label → 같은 언어의 강조|아기+병아리 / BLOOM! / 강도별 bounded marks|기존 cooldown 1050ms 유지|
|4 LINE|기존 무지개 선 유지, 캐릭터/lettering 개선|아기+병아리 / 활짝! / 게임판 위쪽 무지개 stroke|730ms stroke, 820ms 컷인|
|NEW BEST|일반 성공 표시 → 기록 전용 크레용 선/별|행복한 아기+병아리 / 새 기록! / 별|기존 SFX와 같은 이벤트, 820ms|
|BLOOM 위기 탈출|기존 알림/판정 유지, 글자 색·폰트 통일|새 캐릭터 이벤트는 만들지 않음. 기존 callout 사용|기존 시간·오디오 유지|

- 360×640에서는 컷인을 상단의 빈 HUD 공간으로 옮겨 HOLD와 게임판을 보호했다.
- 큰 두 크기에서는 NEXT 2와 HOLD 사이 공간을 사용한다. 초기 후보의 HOLD 겹침을 발견하여 수정했다.
- 컷인·자식 요소 모두 `pointer-events:none!important`. [실제 연출 중 입력 검사](visual/effects-input.json): 2/3/4/6 COMBO, 4 LINE, NEW BEST 모두 PASS.
- 과도한 shake/전체화면 flash는 추가하지 않았다. 기존 reduced 컷인은 450ms이며 꽃가루/무지개 이동을 생략한다.
- SFX를 새로 추가하지 않았다. JS의 동일 이벤트에서 기존 소리와 컷인이 시작된다. 실제 Android에서 들리는 동기감은 별도 확인한다.

[2 COMBO](visual/after/combo2-all.jpg) · [3 COMBO](visual/after/combo3-all.jpg) · [HIGH COMBO](visual/after/combo-high-all.jpg) · [4 LINE](visual/after/four-line-all.jpg)

## 7. LOADING

[AFTER](visual/after/loading-all.jpg). 일반 상태 텍스트에서 그림책 페이지와 작은 종이 TIP으로 정돈했다. 공식 아기/병아리, 크레용 stroke를 HOME과 공유한다. 기존 9개 data-driven TIP은 유지한다. 가짜 percentage 없음.

빈 저장소에서 실제 준비 182.2ms, warm 준비 179.7ms. 클릭부터 QA polling으로 확인한 전환은 각각 208.8/213.9ms였다. 로딩을 보여주기 위한 1~2초 지연은 추가하지 않았다. [신규 설치 측정](visual/tutorial-fresh.json)

[지연/취소 검사](visual/loading.json)는 준비를 의도적으로 1000ms 늦춘 **QA 조건**이다. 실제 180ms 동작과 혼동하지 않는다. 취소한 로딩이 뒤늦게 게임을 여는 문제 없이 PASS. HOME 대표 이미지와 폰트 preload, 기존 celebration preload 구조 유지. 추가 축하 이미지의 해상도는 모바일 실제 용도에 맞게 제한했다.

## 8. TUTORIAL

[BEFORE](visual/before/tutorial-all.jpg) → [AFTER](visual/after/tutorial-all.jpg)

숫자 단계 대신 짧은 크레용 선, 손글씨 행동 문구와 종이 메모를 사용한다. 긴 새 설명을 추가하지 않았다. 기존 성공 체크/병아리 반응과 완료 아기는 유지한다. SKIP은 작은 밑줄 글자이며 설정의 다시 보기 버튼은 유지한다. 별도의 손가락 모션/새 판정은 추가하지 않았다.

**실제 CONTROL observer/성공/completion 판정 변경: NO.** `observe`, `succeed`, `finish` byte 비교 일치. `render()`의 화면용 숫자만 숨기고 접근성 진행 label은 보존했다. 최초 설치와 기존 설정 상태 모두 10단계·잘못된 입력·pause/resume·SKIP·replay·저장 보존 PASS.

## 9. SETTINGS / PAUSE

[SETTINGS BEFORE](visual/before/settings-all.jpg) → [AFTER](visual/after/settings-all.jpg)

소리/느낌/도움의 작은 제목과 종이 구분선, 실제 `aria-pressed`를 가진 손그림 체크로 정리했다. 점수/규칙은 펼쳐보기로 접근 가능하다. BGM/SFX/진동/효과/튜토리얼/Adaptive 기능을 삭제하지 않았다. 웹 카드와 거대한 옵션 버튼 나열을 제거했다.

[PAUSE AFTER](visual/after/pause-all.jpg): 작은 병아리, “잠깐 쉬어갈까요?”, 계속하기 primary. 다시 시작/놀이 방법/홈은 보조 위계. 실제 pause/resume lifecycle은 그대로다.

## 10. GAME OVER / NEW BEST

[BEFORE](visual/before/over-all.jpg) → [GAME OVER AFTER](visual/after/over-all.jpg) · [NEW BEST AFTER](visual/after/best-all.jpg)

공식 캐릭터와 결과가 하나의 장면이 된다. 이번 점수가 가장 크고, BEST는 별도 작은 행, 줄/콤보/시간/BLOOM/생존 기록은 작게 유지한다. 정보 삭제 없음. “다시 하기”가 primary이며 같은 판 재도전과 홈은 보조다. 기록 갱신은 행복한 포즈·손그림 별·짧은 “새 기록!”으로 구분한다.

## 11. PERFORMANCE와 근거 범위

- RC1의 과거 30분 검사는 기존 문서의 근거로 보존한다. 이번 검사 결과와 합치지 않는다.
- 이번 10회 lifecycle: DOM 164 → 164, 종료 타이머 0. [증거](visual/lifecycle.json)
- 연출 검사: 컷인 DOM children 14, marks 12, 종료 celebration timer 0. AudioContext 1개, 관측 peak voice 12 이하(상한28).
- 새 interval/timer/event listener/particle pool 없음. 기존 canvas FX 상한180 유지.
- 제거: 큰 화면 blur, 높은 BLOOM에서 계속 움직이던 배경 선, 여러 legacy gradient/미사용 theme CSS.
- 추가: WOFF 198,824B + 축하 WebP 61,574B + 작은 정적 SVG, 공통 CSS 15,141B. 캐릭터 원본을 여러 고해상도 파일로 늘리지 않았다.
- browser 회귀 검사에서 console error/깨진 이미지 0. 클라우드 frame cadence를 Android 60FPS로 해석하지 않는다.
- 새 30분 wallclock 검사 **PASS**. 실제 30.01분, DROP 1657회, 재시작 152회, 강제 아이템 시나리오 119회. [원본 증거](visual/soak-30min.json).

|실제 샘플|DOM|활성 타이머|AudioContext|marks|heap bytes|
|---|---|---|---|---|---|
|0분|140|0|1|12|10377799|
|10분|142|1|1|12|11318631|
|20분|142|1|1|12|11229866|
|30분|142|1|1|12|11340822|

화면 상태별 DOM 차이와 누적 증가를 구분했다. 10/20/30분 게임 상태의 리소스가 bounded이며, 종료는 정상 pause 화면이다. 첫 샘플 오디오는 unlock 직후 suspended였고 후속 샘플은 running이다. 합성 입력/클라우드 브라우저 검사이며 Android FPS 증거가 아니다.
- 실제 Android 10분 피로도/터치감/오디오 동기/60FPS: **NOT VERIFIED**.

## 12. CONTROL 23 FINAL

변경 **NO**. `clear-input`, `touch-and-buttons`, `actions`, `keyboard`, `replacement-carry` frozen span 5개 SHA 모두 일치. [테스트 출력](visual/control-freeze.txt), 기준 SHA는 `tests/helpers/control23-freeze.json`.

165ms long press, 38→33→29ms repeat, 한 칸 tap, 좌우 회전, UP HOLD, DOWN DROP, 쏙!, multitouch guard 변경 없음. `fit()`, 튜토리얼 관찰/완료, 엔진·점수·아이템·Adaptive 파일 보존. [소스 비교](visual/protected-source.json)

[실제 브라우저 합성 CONTROL 검사](visual/control-final.json): 좌/우 tap 각30, long press 각10, 좌우 swipe 각20, HOLD20, DROP20, multitouch20 및 jitter/벽/해제 회귀 PASS. release 후 추가 이동0. 네이티브 Android 포인터 캡처 검증과는 구분한다.

## 13. QA 및 스크린샷 판정

- 기준 전체 suite 295 PASS / 0 FAIL.
- 후보 전체 suite **295 PASS / 0 FAIL**, skipped0. [출력](visual/automated-tests.txt)
- 동작 test를 완화하지 않았다. 설정 제목 기대 문자열 한 곳을 실제 한국어 UI로 갱신했다.
- [최종 geometry](visual/geometry-final.json): 15화면, FAIL0, NOT VERIFIED0, 이미지 별도 시각 검수2.
- QA selector에서 의도적으로 제거한 HOME 설명 대신 제목을 검사하고 panel entrance가 끝난 후 측정하도록 수정했다. 클라우드 paint deadline을 2→5초로 조정했으며 게임의 전환 시간은 바꾸지 않았다.

|화면|360×640|390×844|412×915|근거|
|---|---|---|---|---|
|HOME|PASS|PASS|PASS|home-all.jpg|
|LOADING|PASS|PASS|PASS|loading-all.jpg, 실제 lifecycle 별도|
|GAME|PASS|PASS|PASS|game-all.jpg|
|BLOOM|PASS|PASS|PASS|bloom-360/390/412.jpg|
|COMBO 2|PASS|PASS|PASS|combo2-all.jpg|
|COMBO 3|PASS|PASS|PASS|combo3-all.jpg|
|HIGH COMBO|PASS|PASS|PASS|combo-high-all.jpg|
|TUTORIAL|PASS|PASS|PASS|tutorial-all.jpg|
|PAUSE|PASS|PASS|PASS|pause-all.jpg|
|SETTINGS|PASS|PASS|PASS|settings-all.jpg|
|GAME OVER|PASS|PASS|PASS|over-all.jpg|
|NEW BEST|PASS|PASS|PASS|best-all.jpg|
|DANGER|PASS|PASS|PASS|danger-all.jpg|
|4 LINE|PASS|PASS|PASS|four-line-all.jpg|

위 PASS는 캡처 기반 **브라우저 시각 검수**다. 자동 geometry PASS나 Android 품질 PASS가 아니다. 세 화면 크기에서 초점·위계·버튼·색 수·텍스트·캐릭터·질감·게임판 가독성을 이미지로 비교했다. HOME/설정/결과의 공통 종이와 lettering이 유지되고, GAME은 장식을 줄여 블록을 우선했다.

캡처 방법: 실제 배포 후보를 사용하는 격리 QA fixture. GAME의 gravity/lockDelay를 정지시켜 상태를 재현한다. COMBO는 실제 DOM/CSS animation의 250ms 지점을 정지한 **시각 시안**이다. LOADING 역시 완성된 실물 renderer의 정지 시안이며 실제 지연 증거가 아니다. 타이밍/입력/취소는 별도의 실제 QA 검사로 측정한다. BLOOM은 브라우저 focus 전환의 정상 자동 pause 영향을 피하기 위해 각 viewport를 독립 캡처했다.

## 14. DEPLOY / 캐시

릴리스 코드 SHA: `c8722bee68a9fd6c303d3f59cf87761165473aae`. GitHub Pages workflow `36344207800` success 확인. 정식 `/dist/`에 직접 접속하여 표시 버전과 자산 key를 확인했다. HOME/GAME/TUTORIAL/SETTINGS/GAME OVER를 배포된 본편 소스로 세 크기씩 다시 캡처·검수했다. [배포 증거](visual/production/deployment.json).

[Production HOME](visual/production/home-all.jpg) · [GAME](visual/production/game-all.jpg) · [TUTORIAL](visual/production/tutorial-all.jpg) · [SETTINGS](visual/production/settings-all.jpg) · [GAME OVER](visual/production/over-all.jpg).

HTML/주요 JS/CSS/HOME/새 마스코트의 Git blob SHA가 검증한 로컬 후보와 일치한다. 이후 증거 저장용 문서 커밋은 게임 파일을 변경하지 않는다. 최종 main/Pages SHA는 완료 메시지에서 별도로 제시한다(문서는 자기 자신의 commit SHA를 포함할 수 없음).

후보의 최종 키 체계: HTML build `CB-RC2`, 표시 `RC2 · CONTROL 23 FINAL · HOME RC2`, JS/CSS/HOME 자산 query `cb-rc2`. 검수 경로의 `review6` suffix는 독립 검수 캐시이며 정식 본편 버전과 구분한다. query 변경만으로 배포 성공을 판단하지 않는다.

## 15. Android 사용자 확인 — NOT VERIFIED

- HOME의 브랜드/START 우선순위와 등장 모션
- 블록·NEXT·HOLD·점수 가독성, 브라우저 주소창 변화와 safe area
- 콤보 크기/가림 및 10분 이상 시각 피로도
- 로딩 답답함, 튜토리얼 이해, 결과 후 재도전 동기
- BGM/SFX와 캐릭터의 체감 동기
- CONTROL 23의 실제 tap/long press/swipe/HOLD/DROP/multitouch 손맛
- 실제 기기의 프레임 안정성/발열

신규 모드·아이템·점수 규칙·상점·랭킹·모래모드/사막 세계관 복원은 없다. 내부 역사적 함수/변수명은 출시 전 무리한 리팩터링을 하지 않았다.

## 16. 최종 시각 자체 검수

|질문|브라우저 시각 검수 판단|범위|
|---|---|---|
|HOME을 소개용 캡처로 쓸 수 있는가?|YES|로고·공식 캐릭터·시작 순서가 명확|
|게임 화면에 브랜드가 남는가?|YES|종이·크레용 블록·lettering을 공유|
|설정이 같은 게임의 일부인가?|YES|소리/느낌/도움과 종이 체크|
|튜토리얼이 임시 개발 안내처럼 보이지 않는가?|YES|숫자 step 숨김, 간결한 메모|
|결과가 숫자만 나열한 dialog를 벗어났는가?|YES|캐릭터·점수·RETRY 위계|
|콤보에 게임 고유의 보상 장면이 있는가?|YES|공식 친구들·크레용 선·꽃/별, 실제 재미 평가는 별도|
|마스코트가 화면별 역할을 갖는가?|YES|표지/동행/성공/결과, 상시 게임판 점유 없음|
|게임판 가독성을 지켰는가?|YES|geometry 동일, 낮은 배경 대비, 컷인 겹침 수정|
|CONTROL을 보호했는가?|YES|frozen SHA/합성 회귀, Android 손맛은 별도|
|장시간 시각 자극을 억제했는가?|YES, 브라우저 관찰 범위|지속 배경 움직임 제거, cooldown/particle 상한 유지; 실제 Android 피로도 NOT VERIFIED|

이 표는 미적 검토자의 판단이다. 자동 테스트가 아름다움이나 상업적 성공을 증명한다는 의미가 아니다.
