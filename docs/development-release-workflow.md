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
