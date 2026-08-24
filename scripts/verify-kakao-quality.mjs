#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run("./node_modules/.bin/jest", [
  "--config",
  "jest.config.ts",
  "tests/socialAuthService.test.ts",
  "tests/kakaoLoginConfig.test.ts",
  "tests/socialLogin409EndToEnd.test.ts",
  "tests/socialSessionRestoreRace.test.ts",
  "tests/socialTermsSingleFlight.test.ts",
  "tests/socialLinkEmailSingleFlight.test.ts",
  "tests/socialAuthContract.test.ts",
  "tests/socialLoginFlow.test.ts",
  "tests/apiClientLocale.test.ts",
  "--runInBand",
])

run("./node_modules/.bin/eslint", [
  "src/services/auth/socialAuthService.ts",
  "src/services/auth/authService.ts",
  "src/services/auth/socialAuthCoordinator.ts",
  "src/services/auth/authAttemptId.ts",
  "src/services/types/serviceTypes.ts",
  "src/services/core/apiClient.ts",
  "src/config/kakaoConfig.ts",
  "src/types/auth.ts",
  "src/features/auth/utils/socialLoginFlow.ts",
  "src/features/auth/hooks/useSocialLogin.ts",
  "src/features/auth/hooks/useTermsAgreement.ts",
  "src/features/auth/views/TermsAgreementScreen.tsx",
  "src/features/auth/views/SocialLinkEmailScreen.tsx",
  "app/(auth)/terms-agreement.tsx",
  "src/hooks/useAuth.ts",
  "tests/socialAuthService.test.ts",
  "tests/socialLoginFlow.test.ts",
  "tests/socialAuthContract.test.ts",
  "tests/socialLogin409EndToEnd.test.ts",
  "tests/socialSessionRestoreRace.test.ts",
  "tests/socialTermsSingleFlight.test.ts",
  "tests/socialLinkEmailSingleFlight.test.ts",
  "tests/apiClientLocale.test.ts",
  "tests/setup.ts",
  "tests/kakaoLoginConfig.test.ts",
  "scripts/verify-kakao-login.mjs",
  "scripts/verify-kakao-quality.mjs",
  "scripts/verify-kakao-diff.mjs",
  "--max-warnings=0",
])
run("./node_modules/.bin/tsc", ["--noEmit", "--pretty", "false"])
run("bun", ["run", "typecheck"], path.resolve(root, "../sinsin-be-bun"))
run(
  "bun",
  ["test", "tests/http/requestClientContext.test.ts"],
  path.resolve(root, "../sinsin-be-bun"),
)

console.log("KAKAO_QUALITY_OK")
