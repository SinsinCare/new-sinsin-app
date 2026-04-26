/**
 * API 테스트용 계정. 루트 `.env` 또는 `tests/.env.test`에
 * TEST_EMAIL, TEST_PASSWORD 를 넣으면 인증 필요 스위트가 실행됩니다.
 */
export function hasTestCredentials(): boolean {
  return Boolean(
    process.env.TEST_EMAIL?.trim() && process.env.TEST_PASSWORD?.trim(),
  )
}

/** 인증이 필요한 describe — 계정 없으면 전체 스킵 */
export const describeAuth = hasTestCredentials() ? describe : describe.skip

/** 인증이 필요한 it */
export const itIfCreds = hasTestCredentials() ? it : it.skip
