# DEV-019 mock auth session lifecycle

## Unit evidence

- `tests/mockAuthSessionLifecycle.test.ts` passes for persistent email-login
  restoration, ephemeral signup/social relaunch behavior, user-ID isolation,
  and deterministic fixture reset.
- The fixture is mock-only and uses `@sinsin/mock-auth/session-fixture/v1`;
  production `tokenService` was not changed.

## Device evidence

Deferred. iOS/Android S9 screenshot and log capture require the main review's
explicit device-run decision. No production backend, production account, or PII
was used for this task.
