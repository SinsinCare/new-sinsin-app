# DEV-20260727-014 — 인증 route·세션 통합 회귀 결과

## 실행 경계

- 앱 runtime 기준: `d82e8e2` (`078354b` 앱 소스 + DEV-014 test/doc harness).
- 최종 test branch 기준: `f46ac9c` (runtime 이후 실제 `app/_layout.tsx` route-guard harness 추가, 앱 소스 변경 없음).
- 환경: iOS Simulator / Android Emulator, `EXPO_NO_DOTENV=1`,
  `EXPO_PUBLIC_USE_MOCK_AUTH=true`, `EXPO_PUBLIC_USE_MOCK_MODE=true`,
  `EXPO_PUBLIC_MOCK_NO_USER=true`, inert-localhost backend.
- 데이터 경계: synthetic fixture만 사용. production host, 실제 계정, 실제
  이메일·전화번호·OAuth provider·PII는 사용하지 않았다.

## 종합 판정

| 범위                                      | 판정                                                                | 근거                                                                                                                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S0 signed-out cold start / relaunch       | PASS                                                                | 양 플랫폼 모두 login route를 복원했고 signed-out protected-query LogBox가 없었다.                                                                                                                                                                                           |
| S1 email login validation / route         | PASS                                                                | invalid email/password와 correct mock login→HOME을 양 플랫폼에서 확인했다.                                                                                                                                                                                                  |
| S1 HOME data surface                      | FAIL (mock adapter gap)                                             | 로그인 뒤 `foodCameraService.fetchDateAnalysis`가 inert backend를 호출해 `[useDateAnalysis] Network Error` LogBox를 노출했다. `DEV-20260727-020`.                                                                                                                           |
| S2 reset validation / OTP / back / expiry | PASS                                                                | 양 플랫폼에서 synthetic OTP와 back/expiry 경계를 확인했다.                                                                                                                                                                                                                  |
| S2 reset completion                       | FAIL (mock adapter gap)                                             | `passwordService`가 mock auth를 우회해 inert `/auth/password/reset`을 호출한다. `DEV-20260727-018`.                                                                                                                                                                         |
| S3 signup / profile / onboarding          | FAIL (mock adapter gap)                                             | iOS는 terms→email OTP→password→name 뒤 `nicknameService`의 inert `/auth/signup/nickname/verify` 호출에서 중단됐다. Android는 OTP 화면 이후 자동화가 전이를 확정하지 못해 그 이후를 `UNVERIFIED`로 남겼다. `DEV-20260727-018`에서 adapter 수정 뒤 양 플랫폼을 다시 실행한다. |
| S4–S5 social provider / consent / link    | UNVERIFIED                                                          | 승인된 TEST provider/token fixture가 없고 production fallback을 사용하지 않았다. 분기 로직은 focused Jest에서 검증했다.                                                                                                                                                     |
| S6 account-state route gates              | PASS (test harness) / UNVERIFIED (device fixture)                   | 실제 `app/_layout.tsx` guard와 route decision harness는 통과했다. 선택 가능한 device account-state fixture는 없다.                                                                                                                                                          |
| S7 restore / refresh / race               | PASS (test harness) / UNVERIFIED (device fixture)                   | persisted refresh success, missing session, refresh 401/network failure, interactive-login-wins를 Jest에서 검증했다. injectable device fixture는 없다.                                                                                                                      |
| S8 blocked account gate                   | PASS (root guard harness) / UNVERIFIED (recovery device fixture)    | `SUSPENDED`와 `WITHDRAWAL_PENDING`의 실제 root sign-out guard는 통과했다. cancellation token fixture는 없다.                                                                                                                                                                |
| S9 session lifecycle relaunch             | PASS (real-service test harness) / UNVERIFIED (mock device fixture) | real `authService` persisted refresh 계약은 Jest에서 통과했다. mock `currentUser`는 메모리 전용이라 cold relaunch를 증명하지 못한다. `DEV-20260727-019`.                                                                                                                    |

## 자동화 검증

- Focused Jest: `authSessionBootstrap`, `authRouteIntegration`,
  `accountStateRoute`, `emailLoginFlow`, `profileSetupMode`,
  `passwordResetFlow`, `socialLoginFlow` — 7 suites / 53 tests PASS.
- `authRouteIntegration.test.ts`는 production source text를 복제하지 않고 실제
  `app/_layout.tsx`의 `RootLayoutNav`를 로드해 signed-out redirect와 blocked-account
  sign-out을 실행한다.
- ESLint, Prettier, `git diff --check`는 변경된 test/doc 범위에서 통과했다.
- `tsc`의 `tests/foodCameraRecovery.test.ts` `globalThis.FormData` 오류는 이 task
  이전부터 존재하는 별도 공백이며 DEV-014 변경과 무관하다.

## 플랫폼 증적

- iOS 상세: [IOS_RESULTS.md](./IOS_RESULTS.md)
- Android 상세: [ANDROID_RESULTS.md](./android/ANDROID_RESULTS.md)
- iOS screenshot/log: [`ios/`](./ios/)
- Android screenshot/log: [`android/`](./android/)

## 발견 항목 분리

| Task               | 범위                                             | 상태            |
| ------------------ | ------------------------------------------------ | --------------- |
| `DEV-20260727-017` | restore failure 시 client cleanup 중복 실행 제거 | DEV-014 뒤 진행 |
| `DEV-20260727-018` | TEST/mock password reset·nickname adapter 완성   | DEV-014 뒤 진행 |
| `DEV-20260727-019` | TEST/mock persistent·ephemeral relaunch fixture  | DEV-014 뒤 진행 |
| `DEV-20260727-020` | TEST/mock HOME date-analysis 외부 호출 제거      | DEV-014 뒤 진행 |

DEV-014 안에서는 발견된 source 결함을 수정하지 않았다. 각 항목은 독립 write
scope와 회귀 기준으로 분리했다.
