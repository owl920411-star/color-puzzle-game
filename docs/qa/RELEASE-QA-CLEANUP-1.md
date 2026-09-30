# RELEASE QA CLEANUP 1 — 2026-09-30

## 변경과 원인

기존 실패는 현재 런타임과 이전 테스트 기대값·소스·버전 표시가 어긋난 문제였다. 배포된 AUDIO6 소리와 CONTROL23 조작은 다시 설계하지 않았다.

| 검사 | 원인 | 수정 |
|---|---|---|
| audio-app | AUDIO1의 무음 이동 기대가 남음 | 성공 이동 효과와 막힌 이동의 무효과를 함께 검증 |
| bloom-audio | src 사본이 배포 AUDIO6보다 이전 버전 | 배포 코드를 src에 동기화, move 지원과 잘못된 효과 거부 검증 |
| control23-freeze | 기존 AUDIO2 성공 이동 소리 추가를 actions 해시에 반영하지 않음 | 이력 확인 후 actions만 갱신, 다섯 구간 보호 유지 |
| rc-version | index 빌드명·자산 쿼리·홈 AUDIO1 표시 불일치 | CB-RC2-RELEASE1/cb-rc2-release1/AUDIO6 통일 |
| tutorial-app | 첫 설치 QA HTML이 index 갱신 이전 사본 | canonical HTML에서 기존 격리 저장 shim을 보존해 재생성 |
| loading-app | 자동 난이도 기본값 이후 기록이 calm 전용 키에 저장됨 | 실제 키 normal-adaptive-v1-calm 검증, 기존 normal 기록 보존 확인 |

## 실제 검증

`node scripts/test-rc.cjs`: **33/33 테스트 파일 묶음 통과, 실패 0, 종료 코드 0**. 실행 로그는 `/tmp/rc-cleanup-final.txt`.

이 수치는 개별 테스트 케이스 합계가 아니다. 실행기는 기존 은퇴 모드의 일곱 파일(endless, engine, entry-recovery, materials, progression, stages, ui)을 제외하는 기존 범위를 그대로 사용한다. 이번 작업에서 제외 목록을 늘리거나 실패 검사를 삭제하지 않았다.

CONTROL23 freeze, control20-stability, pointer-button-guard, control19-hold, tutorial-app, audio-app, toy-preview/main/guidance, player-layout, adaptive 관련 검사 모두 해당 실행에 포함된다. `git diff --check` 통과.

## 미완료 범위

자동 검사는 휴대폰 터치 체감·실제 스피커·광고 표시를 증명하지 않는다. Android 앱/AAB와 광고 SDK 연결, 광고 포함 개인정보처리방침·데이터 보안 최종 신고 및 스토어 심사는 별도 출시 작업이다.

## 휴대폰에서 확인

- 설정에서 게임판 왼쪽/오른쪽을 선택하고 재접속해 유지되는지 확인.
- 짧은 터치·스와이프·롱프레스·쏙!이 기존 동작을 유지하는지 확인.
- 성공 이동/막힌 이동과 게임오버 소리가 자연스러운지 확인.
- 처음에는 기본 착지를 경험하고 장난블록을 만나며, 학습 완료 이후 표시가 영구적으로 숨겨지는지 확인.
- 결과의 기록·다시하기 버튼과 예고가 작은 화면에서 읽히는지 확인.
