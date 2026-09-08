# Sinsin mobile agent guide

신신당부는 CKD 환자를 위한 React Native/Expo 앱이다. UI는 한국어, 코드는 영어를 사용한다.

## 작업과 완료

- 현재 체크아웃·브랜치·미커밋 변경을 확인하고 관련 코드와 문서부터 읽는다. 구현, 영향에 맞는 실행 확인, 발견한 관련 문제 수정까지 완료한다.
- `main`은 운영 상태, `develop`은 공유 작업·테스트 브랜치다. 이 브랜치에서 코드 작업을 시작하면 별도 작업 브랜치를 만들되, 현재 브랜치 작업을 이미 요청받았다면 그대로 진행한다. 기존 변경을 보존하고 명시적 요청 없이 두 브랜치를 이름 변경·삭제·강제 갱신하지 않는다.
- 대화에서 정한 실행 방식과 환경은 계속 적용한다. 필요한 로컬 편집·실행·검증은 반복 승인 없이 진행하고, 부족한 환경 결정만 묻는다. 단순히 “빌드”라고 했을 때 브랜치만으로 로컬/EAS와 `test`/`production`을 정하지 않는다.
- `main` 배포는 production, `develop` 배포는 test를 사용한다. EAS·스토어 제출·운영 변경은 승인된 대상과 범위에서 수행한다. 다른 작업의 서버·포트·설치 앱을 임의로 종료하거나 삭제하지 않는다.

## 화면과 도메인

- 화면 추가·개편 시 [모바일 구조](docs/mobile-frontend-architecture.md)를 읽는다. Expo Router 파일은 얇게 유지하고 동작은 `src/features/<feature>`가 소유한다. 새 UI는 `src/design-system-v2` 토큰·컴포넌트를 사용한다.
- 영양 제한은 프로필과 백엔드 정책을 따른다. CKD 단계·투석 여부·체중·의료진 목표를 무시해 `0.8g/kg`이나 고정 수치를 모든 환자의 목표로 제시하지 않는다.
- 원시 API 오류·구현 용어를 사용자 문구에 노출하지 않는다. 인증·건강 정보·사진·비밀값을 로그와 검증 산출물에 남기지 않는다.
- 한국어 UI 문구 변경 시 [UX writing guide](docs/ux-writing-guide.md)를 읽고 `npm run audit:ux-copy`를 실행한다.
- 색·간격·Pretendard 타이포의 정본은 `src/design-system-v2`다. 폰트 굵기는 `fontFamily` face로 지정하고 RN 텍스트는 `AppText`, 테마는 앱의 `themeStore`를 따르는 `useV2Theme`를 사용한다. `src/theme` 레거시 어댑터를 별도 디자인 정본으로 만들지 않는다.

## 환경과 검증

- 환경값은 gitignored `.env.test`·`.env.production`에서 읽는다. 백엔드 URL·토큰·OAuth plist를 커밋하지 않는다. `test`라는 이름만으로 데이터 격리를 가정하지 않는다.
- 로컬 실행은 선택된 환경에 맞는 `npm run start:test` / `npm run start:prod`, `npm run ios:test` / `npm run ios:prod`, `npm run android:test` / `npm run android:prod`를 사용한다. 자세한 빌드·목업 절차는 필요할 때 [실행 참고](agent-reference.md)를 읽는다.
- 변경 경로에 맞는 검사·회귀 검증을 선택한다. API 테스트 전 실제 접속 대상과 fixture 정리 범위를 확인한다. 문서 수정에 전체 빌드를 기본으로 실행하지 않는다.
- UI는 해당 브라우저·Simulator 흐름을 직접 확인한다. 저장·재진입, 취소·뒤로가기, 로딩·오류, 키보드·큰 글씨·다크 모드는 영향이 있을 때 확인하고 공유 UI의 주요 사용처도 검증한다. 타입·빌드 성공을 화면 동작의 증거로 대신하지 않는다.
- 최종 보고는 변경·검증·남은 제약을 짧게 적고, 목업/Simulator 결과와 외부 연동/실기기/운영 결과를 구분한다.

## 분석 및 배포 보호

- Mixpanel은 `src/features/analytics/`를 통해서만 사용한다. 별도 SDK를 추가하지 않고 IP 기반 위치 추적을 끈다. 이벤트에 이메일·이름·건강 데이터·음식 텍스트·이미지·URL·토큰·자유 입력을 넣지 않는다.
- identity는 백엔드 `user.uid`다. 로그인/가입 성공 이벤트 전에 식별하고 세션 복원 시 재식별, 로그아웃 시 reset한다. 이벤트/속성은 `snake_case` 계약(`src/features/analytics/events.ts`)과 `planning/user-flows/registry/events.yaml`을 함께 갱신한다.
- Android 배포 AAB는 EAS 관리 키스토어로 서명한다. 로컬 Gradle의 debug.keystore 서명 산출물을 Play Store 배포본으로 사용하지 않는다.
- 이 체크아웃의 test 분석은 `.env.test`의 토큰을 사용하며 운영 분석은 별도 운영 프로젝트·토큰 승인 전까지 비활성 상태를 유지한다.
- iOS test/production은 동일 bundle id의 TestFlight를 공유한다. 운영 iOS 제출 후 test 빌드를 올려 테스트 백엔드 빌드가 최신이 되게 한다. `npm run deploy:ios`는 `reclaim:testflight-top`을 연결하며 수동 제출도 같은 후속 작업이 필요하다.
- 한국 외 지역 확장 시 consent와 data residency 요구를 재검토한다.
