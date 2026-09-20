# Jelly Pixels · 젤리 픽셀

100단계 젤리 탈출 퍼즐. 5의 배수 스테이지 이벤트, 개발자 모드, 즉시 터치 및 동시 탈출을 포함합니다.

## 실행 및 배포

실행 파일과 이미지는 `dist/`에 있습니다. 정적 호스팅 출력 폴더는 `dist`, 빌드 명령은 필요 없습니다. 루트 index.html은 dist/로 연결됩니다.

로컬 실행: `python -m http.server 8080 --directory dist`

검증: `node tests/engine.test.cjs`, `node tests/events.test.cjs`, `node tests/touch-recovery.test.cjs`

현재는 젤리 그래픽 버전입니다. 리본 그래픽과 회전 스위치는 아직 구현되지 않았습니다.

진행 기록은 각 브라우저에 저장됩니다. 개발자 모드 테스트는 일반 기록에 반영되지 않습니다.
