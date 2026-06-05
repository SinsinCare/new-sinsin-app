# Development and release workflow

This React Native repository uses two long-lived branches:

| Branch | Purpose | Backend target |
| --- | --- | --- |
| `develop` | Ongoing development and test verification | test backend |
| `main` | Production release state | production backend |

`dev` is no longer used. Use `develop` for work and PRs.

## Environment Summary

| Environment | Backend URL |
| --- | --- |
| test | `<test-backend-api-base-url>` |
| production | `<backend-api-base-url>` |

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

Equivalent EAS profile:

```bash
eas build --platform all --profile test
```

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

## AI Build Requests

When asking Claude, Codex, or another AI agent to build the app, specify the
target environment. If the request does not specify an environment, the agent
should ask first:

| Request target | Use |
| --- | --- |
| test server testing | `test` build commands |
| production release | `production` build commands |

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
