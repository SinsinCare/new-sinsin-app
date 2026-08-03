# Android TEST/mock 실행 결과 — DEV-20260727-014

- 기준: `d82e8e2`, Android Emulator `RN_API_35` (`emulator-5554`)
- 런타임: `EXPO_NO_DOTENV=1`, mock auth/data, `MOCK_NO_USER=true`, TEST, inert-localhost (`127.0.0.1:9/api/v1`)
- 실제 계정·실제 이메일·실제 provider·프로덕션 호스트는 사용하지 않았다. 가입 입력은 synthetic `qa@example.test`뿐이다.

| Matrix | 결과 | 관찰 / 증적 |
| --- | --- | --- |
| S0 signed-out cold/settled/relaunch | PASS | 로그인 화면이 cold·settled·relaunch 뒤에도 유지됐다. `android-s0-signed-out-{settled,relaunch}-head-d82e8e2.png` 및 동일 stem 로그에서 `useDateAnalysis`/`AUTH_SESSION_EXPIRED` LogBox 없음. 초반 blank은 cold bundle 중 캡처라 PASS 증적에서 제외했다. |
| S1 email login validation/happy | PASS (auth route) | `test@sinsin.dev` / `test1234` 로그인 후 HOME 진입: `android-s1-email-active-home-head-d82e8e2.png`. keyboard-visible 입력 증적: `android-s1-email-valid-keyboard-head-d82e8e2.png`. |
| S1 post-login inert-backend surface | FAIL subcheck / environment gap | HOME 도착 후 `[useDateAnalysis] error: ApiError: Network Error`가 화면 LogBox에 보인다. 같은 screenshot/log (`android-s1-email-active-home-head-d82e8e2.*`)에 GET `/food-camera/date-analysis/...` inert-host 실패가 남아 있다. auth route 결과와 분리: auth만 mock이고 날짜 분석 data adapter는 mock되지 않음. 소스 수정은 하지 않았다. |
| S2 reset email→OTP→password | PASS | mock email 전송, `123456` 확인, 새 비밀번호 화면까지 도달: `android-s2-reset-{otp-sent,password}-head-d82e8e2.png`. |
| S2 reset back/expiry | PASS | password에서 Back 후 OTP, 추가 Back 후 email 단계로 되돌아감. OTP expiry 안내 화면도 캡처: `android-s2-reset-back-{to-otp,second}-head-d82e8e2.png`. |
| S3 signup terms→email OTP | PASS (available steps) | required terms 전체 동의 후 synthetic email OTP 전송 화면: `android-s3-{terms-entry,signup-otp-sent}-head-d82e8e2.png`. |
| S3 OTP→password→profile→onboarding | UNVERIFIED | synthetic email에서 `123456`을 입력했지만 확인 뒤 `다음 단계`가 활성화되지 않아 password/profile/onboarding 전이를 실행할 수 없었다. `android-s3-signup-after-verify-head-d82e8e2.png`. mock signup verify adapter/fixture 공백으로 기록하며 성공을 추정하지 않는다. |
| S9 authenticated persistent relaunch | UNVERIFIED (mock fixture limitation) | force-stop/relaunch 후 signed-out Login으로 돌아왔다: `android-s9-email-active-relaunch-head-d82e8e2.png`. `mockAuthService.currentUser`는 모듈 메모리이고 `MOCK_NO_USER=true` cold bundle에서 null로 재초기화되어, 실제 tokenService/authService persistence의 제품 FAIL로 단정하지 않는다. 해당 persistence는 focused Jest integration에서 별도 검증한다. |

## Cleanup

실행 종료 시 Android light / font scale 1.0을 복구하고, 앱·Metro 8088·ADB reverse·AVD를 종료한다. 종료 확인은 상위 실행자에게 전달한다.
