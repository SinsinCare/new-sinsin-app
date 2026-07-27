# Android runtime QA — final `28f7eac`

## Environment

- Device: `RN_API_35` (`emulator-5554`), Android API 35, light mode, font scale `1.0`.
- Fresh local TEST dev client was built and installed after the direct Expo SplashScreen dependency repair; React content launched normally.
- Metro: port `8088`; test/mock/inert shell values: `EXPO_NO_DOTENV=1`, `EXPO_PUBLIC_USE_MOCK_AUTH=true`, `EXPO_PUBLIC_USE_MOCK_MODE=true`, `EXPO_PUBLIC_MOCK_NO_USER=true`, `EXPO_PUBLIC_APP_ENV=test`, backend `http://127.0.0.1:9/api/v1`.
- No production endpoint, real account, or PII was used. The test identities and mock OTP were local fixture values only.
- Native build cache quarantine: `/tmp/sinsin-dev021-android-native-quarantine.vSmrLG` (also recorded in `quarantine-path.txt`).

## Final result

| Scenario | Status | Evidence / outcome |
| --- | --- | --- |
| Native prerequisite | **PASS** | Fresh APK build/install and React launch succeeded on `28f7eac`; no `SplashScreenManager`/`ClassNotFoundException`/`FATAL EXCEPTION` observed in the final runtime. |
| S1 mock email login → HOME | **PASS** | Mock email login reached HOME. Final log review found no `useDateAnalysis` LogBox and no forbidden external `date-analysis` request. |
| S9 persistent email session | **PASS** | The persistent mock email session restored HOME after process relaunch. |
| S2 password reset | **PASS** | `qa@example.test` → mock OTP `123456` → local fixture password reset → login screen return. Google Password Manager storage prompt was declined (`Never`); no credential was saved. See `s2_*` evidence. |
| S3 clean signup / profile / nickname → onboarding and ephemeral relaunch | **PAUSED / UNVERIFIED** | Clean app data reached the signup terms screen. Selecting and submitting service/privacy terms is a legal-agreement acceptance and requires the user to perform that UI action. The user had not done so at handoff, so profile, nickname, onboarding arrival, and ephemeral cold-relaunch signed-out assertions remain unverified. See `s3_*` evidence. |

## Historical blocker evidence

The four `*blocker-b866330*` artifacts are retained as **historical evidence only**. They document the earlier missing `expo.modules.splashscreen.SplashScreenManager` failure on SHA `b866330`; they do not describe the final `28f7eac` runtime, which passed native launch after the dependency fix and fresh client build.

## Artifacts currently present

- `ANDROID_RESULTS.md`
- `quarantine-path.txt`
- Historical: `android-runtime-launch-blocker-b866330.png`, `android-runtime-launch-blocker-b866330.log`, `android-native-rebuild-blocker-b866330.png`, `android-native-rebuild-blocker-b866330.log`
- S2: `s2_otp_before.png`, `s2_after_otp_verify.png`, `s2_otp_typed.png`, `s2_otp_typed2.png`, `s2_password_form.png`, `s2_password_typed.png`, `s2_reset_complete.png`, `s2_login_return.png`, `s2_runtime_forbidden.log`
- S3: `s3_fresh_login.png`, `s3_login_after_devclient_intro.png`, `s3_login_ready.png`, `s3_signup_entry.png`, `s3_terms.png`, `s3_terms_waiting.png`

## Teardown

At wrap-up, the app and Metro are stopped, `adb reverse tcp:8088` is removed, the emulator is shut down, and Android appearance is restored to light mode with font scale `1.0`. No tracked source file was changed; this QA task only created untracked evidence under the declared final evidence path.
