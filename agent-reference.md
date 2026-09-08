# Sinsin mobile task references

필요한 작업의 항목만 읽는다. 명령·라우트·구현 상태의 정본은 현재 체크아웃의 `package.json`, `eas.json`, 코드다.

## 실행 및 배포 작업

- `npm run lint`는 ESLint 검사다. `lint:fix`와 `format`은 파일을 수정하므로 변경 범위를 확인한다.
- `EXPO_PUBLIC_USE_MOCK_AUTH=true npm start`는 인증 목업, `EXPO_PUBLIC_USE_MOCK_MODE=true npm start`는 데이터 서비스 목업이다. `EXPO_PUBLIC_MOCK_NO_USER`와 `npm run ios-no-user`는 프로필 없는 흐름에 사용한다. 목업 성공을 실제 로그인·외부 API 성공으로 보고하지 않는다.
- EAS test: `npm run build:test:ios`, `npm run build:test:android`. EAS production: `npm run build:prod:ios`, `npm run build:prod:android`. 현재 `package.json`과 `eas.json`에서 실제 프로필·환경·제출 동작을 확인한다.
- `npm run deploy:prod`는 빌드와 자동 제출을 포함한다. `npm run ios-release`는 native prebuild의 `--clean`을 포함하므로 기존 native 변경을 확인한 뒤 사용한다.
- Android 앱 package는 `com.mediology.sinsinapp`이다. OAuth 서명 fingerprint와 iOS client ID는 현재 signing/configuration에서 확인한다. `*.apps.googleusercontent.com.plist`는 gitignored 상태를 유지한다.
- 기기 버전 충돌 해결을 위해 앱을 자동 uninstall하지 않는다. 삭제가 필요한 경우 대상과 사용자 데이터 보존 여부를 확인한다.
- 실기기 JS 로그: `adb -s <device-id> logcat -s ReactNativeJS`.

## 구조를 찾을 때

- 라우트와 인증 분기는 `app/_layout.tsx` 및 `app/`에 있다. 탭과 상담 라우트는 체크아웃마다 다를 수 있으므로 실제 파일을 확인한다.
- client state는 `src/stores`, server state는 React Query 및 `src/services/queryClient.ts`가 담당한다.
- `src/services/apiClient.ts`는 인증 API/public API, Bearer/401 갱신 경계를 소유한다. 토큰 CRUD는 `tokenService.ts`, 인증 lifecycle은 `authService.ts` 및 `useAuth`를 확인한다.
- feature별 타입·서비스·훅·화면은 `src/features/`, 공통 domain/API 타입은 `src/types/`에서 찾는다. 오래된 완료 표시나 `.gitkeep` 목록으로 기능 상태를 판단하지 않는다.
- community 구현은 `src/features/recipe/`에서 확인한다. 백엔드 연동/목업 여부는 해당 서비스 구현과 앱 설정에서 확인한다.

## 분석 변경 및 릴리스

- privacy filtering과 초기화는 `src/features/analytics/analyticsClient.ts`에 있다. 허용 속성·identity 경계를 회귀 검증한다.
- 가치 퍼널: 로그인 또는 가입 완료 → `food_analysis_started` → `food_analysis_succeeded` → `food_record_saved`.
- Android 내부 Play AAB는 `npm run build:test:android:aab`를 사용한다.
- TestFlight 운영 제출 후 test 빌드를 최신으로 복구하는 절차는 필수다. 자동 연결은 `deploy:ios`/`reclaim:testflight-top` 스크립트에서 확인한다.
- community API 변경 시 게시글/댓글/좋아요/북마크 캐시를 함께 확인한다. 본문의 이미지 제한은 게시글당 최대 5장, 스토리는 사진 한 장과 서버의 24시간 만료 계약을 유지한다.
