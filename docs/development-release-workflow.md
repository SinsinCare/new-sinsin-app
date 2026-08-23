# Development and release workflow

This React Native repository uses two long-lived branches:

| Branch    | Purpose                                   | Backend target     |
| --------- | ----------------------------------------- | ------------------ |
| `develop` | Ongoing development and test verification | test backend       |
| `main`    | Production release state                  | production backend |

`dev` is no longer used. Use `develop` for work and PRs.

## Environment Files

Do not commit environment values. Local test and production commands load
gitignored env files:

| Environment | Local env file    |
| ----------- | ----------------- |
| test        | `.env.test`       |
| production  | `.env.production` |

Ask the project owner for the actual values.

## Before Updating Local Branches

If you have local work in progress, save it first:

```bash
git status
git add .
git commit -m "wip: save local changes"
```

or:

```bash
git stash push -m "wip before branch/environment sync"
```

Then update local branches:

```bash
git fetch origin --prune
git checkout develop
git pull --ff-only origin develop
git checkout main
git pull --ff-only origin main
git checkout develop
```

If an old local `dev` branch still exists and no local work remains there:

```bash
git branch -D dev
```

## Local Development

Create feature branches from `develop`:

```bash
git checkout develop
git pull --ff-only origin develop
git checkout -b feature/your-feature-name
```

Use the test backend for normal feature work:

```bash
npm run start:test
npm run ios:test
npm run android:test
```

Use the production backend only when explicitly verifying production behavior:

```bash
npm run start:prod
npm run ios:prod
npm run android:prod
```

Run checks before opening or updating a PR:

```bash
npm run lint
```

## Test Build

Test builds use the test backend:

```bash
npm run build:test
npm run build:test:ios
npm run build:test:android
```

Equivalent EAS profiles:

```bash
eas build --platform android --profile test
eas build --platform ios --profile ios-testflight-test
```

The EAS `test`, `preview`, and `ios-testflight-test` profiles all point to the
test backend:
`https://sinsin-test-be-87899379852.asia-northeast3.run.app/api/v1`.

`ios-testflight-test` uses store distribution credentials so it can run in
non-interactive EAS builds. It is a test-backend build, not a production-backend
release build.

## Production Build

Production builds use the production backend:

```bash
npm run build:prod
npm run build:prod:ios
npm run build:prod:android
```

Production deploy with auto-submit:

```bash
npm run deploy:prod
```

The EAS `production` profile reads values from the EAS `production`
environment and points to the production backend:
`https://sinsin-fastapi-87899379852.asia-northeast3.run.app/api/v1`.
repository.

## 프로파일 ↔ 백엔드 (정본: eas.json)

| 프로파일              | 배포      | 백엔드        | 스토어 출시 |
| --------------------- | --------- | ------------- | ----------- |
| `development`         | internal  | 로컬 env 파일 | 불가        |
| `test`                | internal  | 테스트        | 불가        |
| `preview`             | internal  | 테스트        | 불가        |
| `test-aab`            | **store** | 테스트        | **금지**    |
| `test-playstore`      | **store** | 테스트        | **금지**    |
| `ios-testflight-test` | **store** | 테스트        | **금지**    |
| `testflight`          | store     | 운영          | 허용        |
| `playstore`           | store     | 운영          | 허용        |
| `production`          | store     | 운영          | 허용        |

## 스토어 출시 규칙

아래 셋은 **스토어 배포 자격증명을 쓰지만 테스트 백엔드를 본다.**
TestFlight·Play 내부 트랙에 올리려고 store 배포일 뿐이고, 운영 릴리스와
**같은 스토어 앱**(`ascAppId 6758880186`, `com.mediology.sinsinapp`)으로 올라간다.

- `ios-testflight-test`
- `test-aab`
- `test-playstore`

여기서 나온 빌드를 App Store Connect 나 Play 에서 "출시"하면 운영 사용자가
테스트 DB(`sinsin_test`)에 기록한다. 실제로 iOS 1.2.1(빌드 70)이 이렇게 나갔다.

출시는 `testflight` / `playstore` / `production` 프로파일에서만 한다.
`npm run build:prod*`·`npm run deploy*`·`npm run submit:*` 은
`npm run check:release-config` 로 프로파일↔백엔드 짝을 먼저 검사한다.

`eas submit --latest` 는 쓰지 않는다. 직전에 빌드한 것이 무엇이든 집어서
기본 `production` 제출 프로파일로 보내기 때문에, 테스트 빌드가 조용히
스토어로 넘어간다. `npm run submit:*` 은 빌드를 골라서 제출한다.

## 지금 스토어에 나가 있는 것 (2026-08-13 실측)

| 스토어    | 라이브 버전 | EAS 빌드 | 프로파일              | 백엔드     |
| --------- | ----------- | -------- | --------------------- | ---------- |
| App Store | 1.2.1       | 70       | `ios-testflight-test` | **테스트** |
| Play      | 1.2.2       | 75 / 76  | `test-aab`            | **테스트** |

릴리스 프로파일에서 나온 마지막 빌드는 iOS `testflight` 68(1.2.0)·안드 `playstore`
72(1.2.0), 둘 다 8/6 이다. 그 뒤로 스토어에 올라간 것은 전부 테스트 프로파일이다.

**eas.json 의 URL 은 처음부터 맞았다.** `production`/`testflight`/`playstore` 는
운영 백엔드를 가리키고 있었고 지금도 그렇다. 고칠 URL 이 없다 — 잘못된 것은
"테스트 프로파일로 낸 빌드를 스토어에 출시했다"는 선택 하나다.

### 이미 설치된 앱은 다시 빌드해도 안 바뀐다

`expo-updates` 를 안 쓴다(app.json 에 `updates` 없음, EAS 빌드에 채널 없음).
`EXPO_PUBLIC_*` 는 번들에 박혀 나가므로 **OTA 로 백엔드를 돌릴 수 없다.**
운영 백엔드를 보는 빌드를 다시 내서 스토어에 올리는 것 말고는 길이 없다.

그 사이 사용자를 끌어올리는 유일한 수단은 강제 업데이트인데, **설치된 앱은
테스트 백엔드에 `environment=test` 로 물어본다.** 즉 강제 업데이트 정책 행은
운영이 아니라 `sinsin-test-be` 의 `test` 환경에 넣어야 닿는다. 현재 그쪽 응답은
`decision=allow`(`reason=unknown_version`) 라 아무도 안 올라온다.

운영 백엔드에는 이미 `ios / production / 1.2.1 / isLatest=true` 행이
2026-08-07 01:17 에 등록돼 있다 — 빌드 70 이 끝나기 5분 전이다. 운영 릴리스라고
믿고 등록했지만 정작 그 빌드는 운영 백엔드에 말을 걸지 않는다. 이 행은 아무도
읽지 않는다.

## AI Build Requests

When asking Claude, Codex, or another AI agent to build the app, specify the
target environment. If the request does not specify an environment, the agent
should ask first:

| Request target      | Use                         |
| ------------------- | --------------------------- |
| test server testing | `test` build commands       |
| production release  | `production` build commands |

Do not assume the build target only from the current branch.

## Release Flow

Normal development flow:

1. Branch from `develop`.
2. Implement changes.
3. Run local checks.
4. Test against the test backend.
5. Merge into `develop`.

Production release flow:

```bash
git checkout develop
git pull --ff-only origin develop

git checkout main
git pull --ff-only origin main
git merge --ff-only develop
git push origin main
```

Build the production app from `main` with the production backend:

```bash
npm run build:prod
```
