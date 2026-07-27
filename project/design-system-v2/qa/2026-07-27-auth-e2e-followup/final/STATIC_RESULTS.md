# DEV-20260727-021 최종 정적 회귀 결과

- 기준 HEAD: `b866330a35cec1de34cff8333609911e1549ff08` (`b866330 Merge pull request #139 from SinsinCare/work/dev-20260727-017-client-cleanup`)
- 실행 위치: `/Users/mediology/workspace/.worktrees/dev-orchestration/DEV-20260727-021`
- 실행일: 2026-07-27
- 범위: 네트워크/실서버 호출을 하지 않는 auth route, session, mock, signup/email 정적 회귀

## 결과

| 검사                                | 명령                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 결과                                                                                                                           |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 선택 Jest 회귀                      | `npx jest --config jest.config.ts --runInBand tests/authSessionBootstrap.test.ts tests/authRouteIntegration.test.ts tests/accountStateRoute.test.ts tests/emailLoginFlow.test.ts tests/profileSetupMode.test.ts tests/passwordResetFlow.test.ts tests/socialLoginFlow.test.ts tests/mockAuthFlow.test.ts tests/mockAuthSessionLifecycle.test.ts tests/mockDateAnalysisService.test.ts tests/authenticatedFetch.test.ts tests/sessionCleanup.test.ts tests/signupEmailSendFailure.test.ts tests/signupPhonePayload.test.ts tests/emailVerificationState.test.ts` | **PASS** — 15 suites, 86 tests, 0 failures                                                                                     |
| TypeScript                          | `npx tsc --noEmit`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **PASS**                                                                                                                       |
| 범위 ESLint                         | `npx eslint <위 15개 test> app/_layout.tsx src/features/auth src/services/auth src/services/core src/stores/signupStore.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                     | **PASS (0 errors)** — 기존 `src/services/core/apiError.ts`, `src/services/core/tokenService.ts`의 `prettier/prettier` 경고 3개 |
| 범위 Prettier (auth 변경/직접 소스) | `npx prettier --check <위 15개 test> app/_layout.tsx src/features/auth src/services/auth src/stores/signupStore.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                             | **PASS**                                                                                                                       |
| 관련 core 포함 Prettier             | `npx prettier --check <위 15개 test> app/_layout.tsx src/features/auth src/services/auth src/services/core src/stores/signupStore.ts`                                                                                                                                                                                                                                                                                                                                                                                                                           | **FAIL (기존 형식 불일치)** — `src/services/core/apiError.ts`, `src/services/core/tokenService.ts` 2 files                     |
| 전체 Prettier                       | `npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **FAIL (범위 외 기존 형식 불일치)** — 78 files                                                                                 |
| diff whitespace                     | `git diff --check`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **PASS**                                                                                                                       |

## 실행한 Jest suites

- `authSessionBootstrap`: 13 tests
- `authRouteIntegration`: 15 tests
- `accountStateRoute`: 2 tests
- `emailLoginFlow`: 5 tests
- `profileSetupMode`: 4 tests
- `passwordResetFlow`: 8 tests
- `socialLoginFlow`: 11 tests
- `mockAuthFlow`: 3 tests
- `mockAuthSessionLifecycle`: 6 tests
- `mockDateAnalysisService`: 2 tests
- `authenticatedFetch`: 3 tests
- `sessionCleanup`: 2 tests
- `signupEmailSendFailure`: 3 tests
- `signupPhonePayload`: 5 tests
- `emailVerificationState`: 4 tests

합계: **15 suites / 86 tests PASS**.

## 제외한 환경 의존 API suites

`tests/auth.test.ts`, `tests/food.test.ts`, `tests/chat.test.ts`, `tests/profile.test.ts` 및 `test:api:test`/`test:api:prod`는 실행하지 않았다. 이들은 실제 test/production API 환경, 인증 상태 또는 외부 서비스 응답에 의존할 수 있어, 이번 정적 회귀 범위(프로덕션 접근 금지 및 PII 미사용)와 맞지 않는다.

## 비차단 경고 및 작업 트리 상태

- Jest 중 dotenv가 `.env` 및 `tests/.env.test`에서 `0`개 값을 주입했다는 안내 로그와 dotenv 팁이 출력됐다. 인증값 또는 PII는 출력되지 않았으며 테스트 결과에 영향은 없었다.
- 전체 Prettier의 78개 경고와 core 2개 파일의 3개 ESLint formatting warning은 이번 HEAD의 변경 파일(`src/features/auth/utils/authSessionBootstrap.ts`, `src/services/auth/authService.ts`, `tests/authSessionBootstrap.test.ts`)이 아닌 기존 코드 상태다. 수정하지 않았다.
- `node_modules`는 메인 worktree를 가리키는 공유 symlink로 untracked 표기되며, 이 검증에서 생성하거나 수정하지 않았다.

## 판정

요청된 auth/session/mock/signup-email 정적 회귀와 TypeScript, 범위 ESLint, diff whitespace 검사는 통과했다. 전체 저장소 Prettier는 기존 범위 외 형식 불일치 때문에 비통과이며, 이를 이번 task에서 수정하지 않았다.
