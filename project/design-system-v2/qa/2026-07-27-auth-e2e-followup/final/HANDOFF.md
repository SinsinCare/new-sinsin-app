# DEV-20260727-021 session handoff

## Resume point

- Task: `DEV-20260727-021`
- Repository: `sinsin-rn`
- Branch: `work/dev-20260727-021-mock-gap-ios-android-s1-s2-s3-s9`
- Worktree: `/Users/mediology/workspace/.worktrees/dev-orchestration/DEV-20260727-021`
- Current commit: `28f7eacdaa9db14c7cfe16eae3627b09761fcdb5`
- Base: `origin/develop` at the same commit
- Runtime policy: TEST/mock/inert only. Do not use production endpoints, real accounts, or PII.

Before continuing, claim the task and run its context:

```sh
/Users/mediology/workspace/dev-orchestration/tools/workctl claim DEV-20260727-021 --agent <agent-id>
/Users/mediology/workspace/dev-orchestration/tools/workctl context DEV-20260727-021
```

## Completed

- Static regression: 15 suites / 86 tests passed, and TypeScript passed.
- PR #140 added the Expo SDK 55 `expo-splash-screen` dependency and was merged into `develop` as `28f7eac`.
- Android fresh local dev client:
  - new APK built and installed from `28f7eac`;
  - React `main` rendered;
  - no `SplashScreenManager`, `ClassNotFoundException`, or fatal launch error;
  - S1 mock email login to HOME passed;
  - S9 force-stop and cold relaunch restored HOME;
  - S2 `qa@example.test` → `123456` → `Test1234` returned to login.
- iOS at pre-dependency SHA `b866330`:
  - S1 login to HOME passed;
  - no `useDateAnalysis`, `/food-camera/date-analysis`, or LogBox match;
  - S9 process relaunch restored HOME.

## Remaining

1. Android S3 is paused at the service/privacy terms screen.
   - An agent must not submit the legally binding acceptance.
   - Bring the TEST app back to the terms screen and ask the user to tap `전체 동의` → `동의하고 계속하기`.
   - Then finish signup/profile/name/nickname/onboarding and prove a cold relaunch returns the ephemeral signup to signed-out.
2. Re-run iOS S2 and S3. For strict final evidence, use current `develop` SHA `28f7eac`.
3. Update both platform result documents with final screenshots/logs and exact SHA.
4. Confirm tracked source diff is empty, commit only `final/**`, push the task branch, open a PR to `develop`, and merge only after the task acceptance criteria are fully met.

## Runtime restart notes

- Android device: `RN_API_35`
- Android Metro: `8088`
- iOS simulator used: `iPhone 17 Pro`
- iOS Metro: `8087`
- Environment:
  - `EXPO_NO_DOTENV=1`
  - `EXPO_PUBLIC_USE_MOCK_AUTH=true`
  - `EXPO_PUBLIC_USE_MOCK_MODE=true`
  - `EXPO_PUBLIC_MOCK_NO_USER=true`
  - `EXPO_PUBLIC_APP_ENV=test`
  - `EXPO_PUBLIC_BACKEND_URL=http://127.0.0.1:9/api/v1`
- If Android native paths mix the base checkout and this worktree again, inspect stale generated CMake paths before rebuilding. The previous native cache was quarantined under the path recorded in `android/quarantine-path.txt`.

## Evidence

- `STATIC_RESULTS.md`
- `android/ANDROID_RESULTS.md`
- `ios/IOS_RESULTS.md`
- Android S2 and S3 screenshots under `android/`
- iOS S1/S9 screenshots and filtered logs under `ios/`
