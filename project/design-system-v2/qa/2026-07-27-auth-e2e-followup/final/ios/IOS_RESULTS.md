# iOS final runtime QA — DEV-20260727-021

## Runtime

- SHA: `b866330`; iPhone 17 Pro / iOS 26.5
- TEST/mock/inert: `EXPO_NO_DOTENV=1`, mock auth/mode/no-user all `true`, `EXPO_PUBLIC_APP_ENV=test`, backend `http://127.0.0.1:9/api/v1`; Metro `8087`.
- Smart Invert baseline was ON. It was OFF for captures and restored ON; display restored to light / large.

## Results

| Scenario | Result | Evidence |
| --- | --- | --- |
| S1 mock email login → HOME | PASS | Computer Use entered `test@sinsin.dev` / `test1234`, submitted Login, and observed the selected Home tab. [screenshot](screenshots/b866330-s1-home.png) |
| S1 no `useDateAnalysis` LogBox or `/food-camera/date-analysis` call | PASS | Five-minute simulator-app log filter for `useDateAnalysis|food-camera/date-analysis|LogBox` has zero lines: [filter](logs/b866330-s1-forbidden-patterns.log). Inert-host traffic is separately captured in [host log](logs/b866330-inert-host.log). |
| S9 persistent login process kill/relaunch → HOME | PASS | App was terminated with `simctl terminate` and relaunched with `simctl launch`; Computer Use again observed the selected Home tab. [screenshot](screenshots/b866330-s9-relaunch-home.png) |
| S2 password reset → login | UNVERIFIED | A clean app fixture was created after S9. The newly installed development client required a fresh development-server connection/first-run menu; the reset form was not reached before the QA execution window ended. |
| S3 signup/profile → onboarding; relaunch signed-out | UNVERIFIED | Same clean-fixture time limit; no signup fixture was created, so no ephemeral-session claim is made. |

## Build and cleanup

- Clean Debug native build completed after roughly 17 minutes; the app installed and loaded the TEST/mock bundle from Metro 8087.
- App and Metro started for this run were terminated at completion. No production host, real account, or user data was used.
- No tracked source changes were made; this evidence directory is the only task output (alongside pre-existing untracked `node_modules`).
