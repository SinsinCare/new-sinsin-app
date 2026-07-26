# DEV-20260727-014 — 인증·세션 iOS/Android TEST 실행 매트릭스

## 목적과 경계

- 기준 SHA: `origin/develop`의 `078354b` (PR #134 병합 포함)에서 실행한다. 실행을 시작할 때 `git rev-parse --short HEAD`를 각 증적에 함께 남긴다.
- 대상은 iOS Simulator와 Android Emulator의 **TEST/mock** 런타임이다. 프로덕션 호스트, 실제 계정, 실제 이메일·전화번호·개인정보를 사용하지 않는다.
- 이 문서는 실행 계획과 결과 기록 위치다. 버그 수정은 하지 않으며, 발견 항목은 별도 write-scoped task로 분리한다.
- 실제 외부 OAuth provider 성공은 mock만으로 재현할 수 없다. Google/Apple/Kakao는 버튼 진입·취소·오류 안내만 TEST build/승인 test provider에서 별도 확인한다.

## 런타임 계약

### signed-out/route UI matrix (기본)

아래 셸 환경으로 Metro를 시작한다. `.env`가 재주입되지 않도록 `EXPO_NO_DOTENV=1`을 반드시 유지한다.

```bash
EXPO_NO_DOTENV=1 EXPO_PUBLIC_USE_MOCK_AUTH=true EXPO_PUBLIC_USE_MOCK_MODE=true EXPO_PUBLIC_MOCK_NO_USER=true EXPO_PUBLIC_APP_ENV=test EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:9/api/v1 npx expo start --clear --port <platform-port>
```

- `127.0.0.1:9`는 의도적으로 연결 불가(inert) 호스트다. mock auth/data가 아닌 요청이 새로 발생하면 log에 명확히 드러난다.
- 시작·settled·relaunch 시 bundle/Metro 로그에서 `EXPO_PUBLIC_MOCK_NO_USER=true`와 `AUTH_SESSION_EXPIRED` LogBox 부재를 확인한다.
- `mockAuthService`는 기본적으로 `DEFAULT_MOCK_USER`를 만들므로, signed-out 검증에서 `MOCK_NO_USER` 누락은 실패다.

### authenticated/mock matrix (제한된 happy path)

mock은 상태 주입 기능이 제한적이다. 아래 fixture를 사용하되, 상태별 route 복원은 unit route/session test와 TEST backend contract를 함께 써야 한다.

| fixture              | 입력/전이                                 | mock이 제공하는 결과            | 사용 범위                    |
| -------------------- | ----------------------------------------- | ------------------------------- | ---------------------------- |
| `mock-email-active`  | `qa@example.test` / `test1234`            | `ACTIVE`, HOME                  | 이메일 로그인 happy/relaunch |
| `mock-email-invalid` | 동일 이메일 + 잘못된 비밀번호             | 오류                            | 이메일 로그인 error/retry    |
| `mock-signup`        | 가입 email OTP + profile + signup         | `PENDING_ONBOARDING`, ephemeral | 이메일 회원가입→온보딩 진입  |
| `mock-social`        | provider native 결과를 승인 mock으로 주입 | `PENDING_ONBOARDING`            | social 성공 후 route 단위    |
| `mock-profile`       | `completeProfile`                         | `PENDING_ONBOARDING`            | 프로필 완료 route            |

mock은 `PENDING_PROFILE`, `ACTIVE + requiresAdditionalInfo`, `WITHDRAWAL_PENDING`, refresh 401/network failure를 런타임에서 선택적으로 주입하지 못한다. 이 상태는 아래 **새 실행 필요** 항목처럼 unit/integration harness 또는 TEST backend 전용 fixture가 준비된 뒤 실행한다. production API를 대체 수단으로 사용하지 않는다.

## 공통 증적 규칙

- 디렉터리: `project/design-system-v2/qa/2026-07-27-auth-e2e/`.
- 이미지: `<platform>-<case>-<state>-<action>-head-<sha>.png`.
  - 예: `ios-email-login-active-happy-head-078354b.png`.
- 로그: 동일 stem의 `.log`; 시작 명령에서 민감한 값은 적지 않는다. host는 `inert-localhost` 또는 `test-backend-approved`처럼 식별한다.
- 각 결과는 `RESULTS.md`에 `PASS` / `FAIL` / `UNVERIFIED`, device/OS, SHA, env class, host class, screenshot/log 링크, bug task를 한 줄로 기록한다.
- keyboard가 보이는 form은 keyboard-visible와 keyboard-dismissed를 각각 캡처한다. back/relaunch는 전·후 두 장을 남긴다.

## 실행 매트릭스

| ID  | state / route                                                         | happy · error · back · relaunch 확인                                                                                                                                | iOS                                     | Android                                 | 현재 증적                                                                                                                                            | 이번 DEV-014 실행                                                                                                              |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| S0  | signed-out → `/(auth)/login`                                          | cold start, settled, relaunch, no protected-query LogBox                                                                                                            | 필수                                    | 필수                                    | 재사용: `../2026-07-27-auth-integration/clean-signed-out-login.png`, `relaunch-signed-out-login.png`, `relaunch-signed-out.log` (Android signed-out) | iOS clean/relaunch 새 실행; Android은 final SHA로 재실행                                                                       |
| S1  | login → email login                                                   | 진입, invalid email, invalid password, correct mock login, Android hardware Back                                                                                    | 필수                                    | 필수                                    | 재사용: login iOS/Android route·invalid·keyboard 증적                                                                                                | 양 플랫폼 correct mock login + relaunch 새 실행                                                                                |
| S2  | email login → forgot password                                         | email invalid, send, 6-digit OTP, password, back password→OTP→email, expiry, relaunch safe state                                                                    | 필수                                    | 필수                                    | 재사용: iOS full interactive; Android full interactive retry/back/expiry                                                                             | final SHA에서 iOS/Android happy·back·relaunch 새 실행 (OTP mock)                                                               |
| S3  | login → terms → signup email → signup password → profile → onboarding | required terms disabled/error, email OTP send/verify/resend, password validation, profile required values, completion; step back; app relaunch while ephemeral      | 필수                                    | 필수                                    | 부분 재사용: Android `signup-email-otp-cta/sent`; DEV-007 note says profile→onboarding 미검증                                                        | 양 플랫폼 end-to-end 새 실행; password/profile automation 불안정 시 `UNVERIFIED`와 화면 증적                                   |
| S4  | social login existing account                                         | Google/Apple/Kakao button, provider cancel silent, provider email/error guidance, completed account destination                                                     | iOS: Google/Apple/Kakao                 | Android: Google/Kakao                   | unit `socialLoginFlow.test.ts`만 flow 분기 보장                                                                                                      | provider TEST fixture/승인 mock 없으면 UI 진입·cancel만 실행, success `UNVERIFIED`                                             |
| S5  | social consent/link                                                   | social consent→terms→profile; legacy social-link email OTP→link password; back/error/relaunch                                                                       | 필수                                    | 필수                                    | unit social success/error branch만                                                                                                                   | social token fixture가 없으므로 `UNVERIFIED` unless TEST backend fixture authorized                                            |
| S6  | persisted session → route gate                                        | ACTIVE→HOME, PENDING_PROFILE→profile, PENDING_ONBOARDING→onboarding, ACTIVE+additionalInfo→profile; restart preserving exact gate                                   | 필수                                    | 필수                                    | unit `accountStateRoute`, `emailLoginFlow`, `profileSetupMode`                                                                                       | mock cannot inject gates; add/run route integration harness then runtime fixture tests                                         |
| S7  | restore race / refresh                                                | restore success, expired refresh/401 clears to login, network failure clears safely; interactive login during delayed restore wins                                  | unit mandatory; runtime when injectable | unit mandatory; runtime when injectable | `authSessionBootstrap.test.ts` covers restore, missing session, interactive-wins; no 401/network explicit case                                       | add `tests/authRouteIntegration.test.ts` coverage before final sign-off; runtime remains `UNVERIFIED` until injectable fixture |
| S8  | blocked account gate                                                  | `WITHDRAWAL_PENDING`/`SUSPENDED` automatic signout; withdrawal cancellation single-flight, restored entry gate                                                      | 필수                                    | 필수                                    | unit `socialLoginFlow.test.ts` cancellation route only                                                                                               | TEST backend withdrawal fixture required; otherwise `UNVERIFIED` and no production fallback                                    |
| S9  | account lifecycle after success                                       | persistent email login survives relaunch; ephemeral signup/social session signs out on background until promotion; profile/onboarding ownership isolated by user ID | 필수                                    | 필수                                    | unit bootstrap/profile setup and onboarding ownership rules; no complete device proof                                                                | new device runs for mock email persistent + mock signup ephemeral; cross-user onboarding requires fixture/harness              |

## 최소 실행 순서

1. S0 signed-out clean/relaunch를 먼저 통과한다. 이 단계 실패 시 다른 route 결과는 유효하지 않다.
2. S1/S2를 mock-only로 양 플랫폼에서 실행한다.
3. S3를 한 플랫폼씩 직렬 실행해 ephemeral session, profile, onboarding 전이를 기록한다.
4. S4/S5/S8은 승인된 TEST provider/backend fixture가 있는 경우만 실행한다. 없는 경우 해당 상태를 성공으로 추정하지 않고 `UNVERIFIED`로 남긴다.
5. S6/S7은 route/session unit tests와 새 integration harness를 먼저 통과시킨 후, injectable runtime fixture가 있을 때만 device proof를 추가한다.
6. 마지막으로 S9 relaunch/background matrix를 실행하고 `RESULTS.md`의 미검증 사유를 정리한다.

## 기존 증적 재사용 판정

재사용 가능한 것은 **해당 화면/행동이 캡처돼 있고 새 SHA가 그 경로를 바꾸지 않았을 때의 보조 증적**뿐이다. DEV-014 최종 PASS는 기준 SHA로 각 필수 row를 다시 실행한 결과로만 판정한다.

| 재사용 가능 보조 증적                                                                    | 커버 범위                                               | 한계                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------- |
| `clean-signed-out-login.png`, `relaunch-signed-out-login.png`, `relaunch-signed-out.log` | Android signed-out clean/relaunch, LogBox 관찰          | final SHA/양 플랫폼 proof 아님   |
| `login-ios-*.png`, `login-android-interactive-*.png`                                     | login/email 진입, keyboard, invalid email, Android Back | correct-login/relaunch 없음      |
| `password-reset-ios-interactive-*.png`                                                   | iOS reset email/OTP/password/back/expiry                | final SHA/재시작 전체 proof 아님 |
| `password-reset-android-interactive-retry-*.png`                                         | Android reset happy/back/expiry                         | final SHA/재시작 전체 proof 아님 |
| `signup-email-otp-cta-android.png`, `signup-email-otp-sent-android.png`                  | Android signup email OTP 일부                           | profile→onboarding·relaunch 없음 |
| `accessibility-fix-*-final-head-*.png`                                                   | DEV-016 dark/large text visual regression               | auth state transition proof 아님 |

## 이미 검증된 코드 단위와 공백

- 현존 unit coverage: `authSessionBootstrap.test.ts`, `accountStateRoute.test.ts`, `emailLoginFlow.test.ts`, `profileSetupMode.test.ts`, `passwordResetFlow.test.ts`, `socialLoginFlow.test.ts`.
- 아직 파일이 없는 선언 scope: `tests/authRouteIntegration.test.ts`. S6/S7 acceptance를 충족하려면 이 파일에 root-route state와 401/network restore behavior를 넣어야 한다.
- `authSessionBootstrap.test.ts`는 stale restore 결과가 interactive login을 덮지 않는 경우를 검증한다. restore rejection/401/network failure은 `useAuthSessionBootstrap`의 catch와 client-session cleanup을 integration level에서 명시적으로 검증해야 한다.
- mock auth는 refresh token/API 401, withdrawal pending, specific `entryGate`, cross-user onboarding persistence를 선택적으로 만들 수 없다. 이들은 TEST backend fixture 또는 DI test harness 없이는 device PASS를 표기할 수 없다.

## PASS 기준

- 각 필수 device row(S0–S3, S9에서 mock으로 가능한 부분)는 iOS와 Android 모두 screenshot+log로 `PASS`여야 한다.
- S4–S8은 승인 TEST fixture 또는 test harness로 확인해야 한다. fixture 부재는 `PASS`가 아니라 `UNVERIFIED`이며, DEV-014 최종 sign-off 전에 별도 task/결정으로 해소한다.
- production endpoint, 실제 이메일/전화번호, 실제 OAuth 계정, token, OTP, session 또는 PII가 증적·로그·문서에 포함되면 해당 실행은 무효다.
