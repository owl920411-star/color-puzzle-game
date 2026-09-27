# CRAYON BLOOM · 크레용블룸

공식 아기 마스코트와 노란 병아리가 함께하는 크레용 손그림 모바일 블록 퍼즐입니다. 현재 제품은 10×20 보드의 **단일 무한 모드**입니다. 모래·물·젤리·스테이지·오늘의 도전 모드는 제품에 포함하지 않습니다.

## 실행

- Production 진입점: `dist/index.html`. 루트 `index.html`은 `dist/`로 이동합니다.
- 로컬 실행: `python -m http.server 8080 --directory dist`
- GitHub Pages: <https://owl920411-star.github.io/color-puzzle-game/dist/>
- 코드 반영, 호스팅 배포 성공, 브라우저 검사, 실제 Android 조작감 검증은 별개의 상태입니다.

## 현재 조작

CONTROL 23 최종 후보를 기준으로 입력 영역을 동결합니다. 회귀 검사와 동결 범위는 `docs/RC1-CONTROL-FREEZE.md`에 기록합니다.

- 게임판 왼쪽·오른쪽을 짧게 터치: 해당 방향 한 칸 이동.
- 같은 영역을 길게 누르기: 빠른 연속 이동. 손을 떼면 정지.
- 좌우 스와이프: 해당 방향으로 한 번 회전.
- 위 스와이프: 보관. 아래 스와이프 또는 쏙! 버튼: 즉시 하강.
- 별도 보관·회전·쏙! 버튼과 키보드 조작도 유지합니다.

## 게임 규칙

완성된 가로줄을 지우고 연속 제거로 콤보를 만듭니다. 시간이 지나면 BLOOM 단계가 오르고 꽃밭 지반이 상승합니다. 기존 점수·지반·Adaptive 규칙은 RC 연출 작업으로 변경하지 않습니다.

| 도움 도구 | 효과 |
|---|---|
| 무지개 크레용 | 줄 완성 후 가장 아래 적재 줄 하나 제거 |
| 꽃송이 지우개 | 줄 완성 시 주변 3×3 고정 블록 제거 |
| 별빛 스티커 | 줄 완성 시 같은 열 아래쪽 고정 블록 최대 6개 제거 |

| 방해 낙서 | 효과 |
|---|---|
| 삐뚤빼뚤 스티커 | 두 번 줄을 완성해야 제거되는 겹친 스티커 |
| 엉킨 크레용 | 착지 후 12초가 지나면 안전한 인접 빈칸에 방해 블록 하나 추가 |
| 먹구름 낙서 | 착지 후 15초가 지나면 인접 블록 최대 2개를 겹친 스티커로 변경 |

아이템의 추가 제거는 직접 점수나 콤보를 주지 않습니다. 기존 보조 도구함도 유지합니다.

## 원본과 생성 파일

- 홈·콤보·사운드·로딩·튜토리얼 원본: `src/bloom-*.js`, `src/bloom-*.css`, `src/assets/`.
- 정적 빌드: `node scripts/build-home.cjs`. 위 원본을 `dist/`에 복사합니다.
- 게임 원본: 현재 `dist/endless-app.js`와 해당 게임 모듈을 직접 유지합니다. 별도 번들러는 없습니다.
- 입력: `endless-app.js`, `pointer-button-guard.js`.
- 규칙: `engine.js`, `endless-rules.js`, `block-items.js`.
- 연출: `crayon-bloom-fx.js`, `bloom-item-art.js`.
- Adaptive: `adaptive-director.js`, `adaptive-audit.js`, `adaptive-bridge.js`.

`dist/control23.html`은 예전 테스트 링크를 현재 진입점으로 보내는 문서입니다. 폐기된 게임 모드를 실행하지 않습니다.

## 저장 데이터

최고점과 사용자 설정은 기존 `glassfall-v1`, Adaptive 데이터는 `glassfall-adaptive-v1`에 보존합니다. 역사적인 키 이름을 바꾸거나 localStorage 전체를 초기화하지 않습니다. 계정 동기화나 온라인 순위표는 없습니다.

기존 소리 설정에 BGM·효과음 개별 설정을 추가합니다. 첫 사용자 튜토리얼은 실제 게임 입력 결과를 관찰하며 연습 기록을 최고점과 Adaptive에 포함하지 않습니다. 완료 또는 건너뛰기는 기존 설정에 `tutorialCompleted`를 추가하며, 설정에서 언제든 다시 볼 수 있습니다.

## 검증

```sh
node --check dist/endless-app.js
node scripts/build-home.cjs
node scripts/test-rc.cjs
```

일부 과거 프로젝트 테스트는 현재 폐기된 진입점과 모드를 대상으로 합니다. 해당 테스트를 맞추려고 모래모드나 호환 실행 경로를 복원하지 않습니다. 현재 RC 검증 결과는 각 Phase 기록을 기준으로 확인합니다.

통합 검수 근거와 Android 미검증 항목은 `docs/RC1-RELEASE-QA.md`에 기록합니다. 개발 검수 페이지 `dist/qa/rc-review.html`은 실제 런타임을 불러오되 저장소의 메모리 사본을 사용합니다. 합성 포인터 검사는 실기기 터치 평가를 대신하지 않습니다.

## 과거 파일과 자산

과거 프로젝트 파일·문서는 추적을 위해 남아 있으나 현재 게임 화면에서 실행하거나 노출하지 않습니다. 상세 목록, 자산 출처와 정리 범위는 `docs/RC1-SURFACE-AUDIT.md`를 참고하세요. 사용자에게 보이는 이름은 CRAYON BLOOM으로 통일하고, 기록 보존과 동작 안정성에 필요한 내부 식별자는 유지합니다.
