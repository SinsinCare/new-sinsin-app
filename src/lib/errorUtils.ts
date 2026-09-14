import { ApiError } from "@/src/services/core/apiError"
import { logger } from "./logger"
import { resolveError } from "./errorMessage/resolve"

/**
 * 세션 만료는 이미 처리된 흐름이다 — 토큰 갱신이 실패하면 앱이 로그아웃시키고
 * 로그인 화면으로 보낸다. 이걸 error 로 찍으면 dev 에서 LogBox 가 화면을 덮어
 * 하단 버튼을 가려버린다(실제로 시뮬레이터에서 로그인 CTA 가 안 눌렸다).
 */
export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.code === "AUTH_SESSION_EXPIRED"
}

/** 네트워크 끊김도 사용자에게 토스트로 이미 알린다. 로그는 조용히. */
export function isExpectedRequestError(error: unknown): boolean {
  if (isSessionExpiredError(error)) return true
  return error instanceof ApiError && error.isNetworkError
}

/**
 * 화면이 스스로 복구하는 실패의 기록용. 예상 가능한 실패(세션 만료·오프라인)는
 * debug 로 내리고, 나머지만 error 로 남긴다.
 */
export function logRecoverableError(label: string, error: unknown): void {
  if (isExpectedRequestError(error)) {
    logger.debug(label, error)
    return
  }
  logger.error(label, error)
}

/**
 * 인라인 오류 문구(한 덩어리 문자열)가 필요한 자리용 — 폼 아래 빨간 줄, 화면 안내문.
 *
 * **판정은 하지 않는다.** `resolveError` 가 고른 제목+본문을 한 문자열로 이어 줄 뿐이다.
 * 예전에는 이 함수가 판정까지 했고, 그래서 두 가지가 틀렸다.
 *
 *  1. 응답이 없는 모든 실패를 `인터넷 연결을 확인한 뒤 다시 시도해 주세요.` 로 묶었다.
 *  2. **폴백이 서버 코드를 이겼다.** `getErrorMessage(e, "프로필을 저장하지 못했어요…")`
 *     가 `SIGNUP_ERROR_003`(닉네임 중복)을 덮어써서, 무엇을 고쳐야 하는지 말해 주지
 *     않았다. 지금은 코드가 폴백을 이긴다(`resolve.ts` 머리말).
 *
 * 버튼을 줄 수 있는 자리라면 이것 말고 `presentError` 를 쓴다 — 토스트/다이얼로그와
 * 해결 버튼까지 함께 고른다.
 */
export function getErrorMessage(error: unknown, fallback?: string): string {
  const resolved = resolveError(error, { fallback })
  if (resolved.silent) return ""
  return resolved.body ? `${resolved.title} ${resolved.body}` : resolved.title
}
