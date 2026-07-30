import { ApiError } from "@/src/services/core/apiError"
import { getAppLanguage } from "@/src/i18n"
import { logger } from "./logger"

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
 * 서버 봉투에 담겨 온 문구인가 — 즉 백엔드가 큐레이션한 카탈로그에서 온 문구인가.
 *
 * 백엔드는 에러/성공 코드마다 사람이 쓴 문구를 갖고 있고(`messages_en.py` 기준
 * 171개), `Accept-Language` 에 맞춰 언어까지 골라 준다. **그건 그대로 보여주는 게
 * 맞다.** 감춰야 하는 건 카탈로그를 거치지 않은 문자열(axios 메시지, 예외 텍스트)뿐이다.
 *
 * 예전에는 코드를 보지 않고 **문구 자체를 정규식으로 검사**해서 숨길지 정했다.
 * 그 정규식이 `/i` 아래 `[A-Z][A-Z0-9_]{2,}` 를 갖고 있어서 사실상 "영어 문장"과
 * 같은 뜻이 됐고, 실측 결과 **영어 문구 171개가 전부(100%) 감춰졌다.** 영어 사용자는
 * 서버 안내를 한 번도 보지 못한 채 늘 일반 폴백만 봤고, 한국어 사용자만 제대로 봤다.
 * 어휘 목록을 손보는 걸로는 부족하다 — "That code expired. Request a new one." 처럼
 * 꼭 필요한 안내에도 `request`·`status` 같은 평범한 단어가 들어 있기 때문이다.
 */
function isCuratedServerMessage(error: ApiError): boolean {
  const code = error.code
  if (!code) return false
  // 봉투 없이 상태코드만으로 합성한 코드. 이때의 message 는 신뢰할 수 없다.
  return code !== "UNKNOWN" && !/^HTTP_\d+$/.test(code)
}

/** 카탈로그를 거치지 않은 문자열에만 적용하는 개발자 표현 검사. */
const INTERNAL_JARGON =
  /\b(?:api|http|json|axios|trace(?:back)?|exception|timeout|undefined|null)\b|서버|토큰|엔드포인트/i

/** `TOKEN_ERROR_001` 같은 대문자 에러코드. `i` 플래그를 붙이면 안 된다. */
const INTERNAL_CODE = /(?:^|[^A-Za-z])[A-Z][A-Z0-9_]{2,}(?![a-z])/

/** `/api/v1/...` 같은 경로. */
const INTERNAL_PATH = /\/[a-z0-9_-]+\//i

export function isInternalLookingMessage(message: string): boolean {
  return (
    INTERNAL_JARGON.test(message) ||
    INTERNAL_CODE.test(message) ||
    INTERNAL_PATH.test(message)
  )
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  const isEnglish = getAppLanguage() === "en"
  if (error instanceof ApiError) {
    if (error.code === "AUTH_SESSION_EXPIRED" || error.statusCode === 401) {
      return isEnglish
        ? "Your session has expired. Sign in again."
        : "로그인이 만료됐어요. 다시 로그인해 주세요."
    }
    if (error.isNetworkError) {
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        return isEnglish
          ? "The response is taking longer than expected. Try again in a moment."
          : "응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요."
      }
      return isEnglish
        ? "Check your internet connection and try again."
        : "인터넷 연결을 확인한 뒤 다시 시도해 주세요."
    }
    if (error.statusCode === 429) {
      return isEnglish
        ? "We’re getting a lot of requests right now. Try again in a moment."
        : "이용이 잠시 몰리고 있어요. 잠시 후 다시 시도해 주세요."
    }
    if (error.statusCode && error.statusCode >= 500) {
      // 5xx 는 서버 잘못이다. 연결 문구를 쓰면 사용자가 자기 네트워크를 의심하게 된다.
      return isEnglish
        ? "Something went wrong on our side. Try again in a moment."
        : "서비스에 문제가 생겼어요. 잠시 후 다시 시도해 주세요."
    }
    if (fallback) return fallback

    const message = error.message.trim()
    // 언어가 어긋난 문구는 큐레이션 여부와 무관하게 감춘다 — 영어 화면에 한국어가
    // 튀어나오는 편이 일반 폴백보다 나쁘다.
    const languageMismatch = isEnglish
      ? /[가-힣]/.test(message)
      : !/[가-힣]/.test(message)
    const looksInternal =
      languageMismatch ||
      (!isCuratedServerMessage(error) && isInternalLookingMessage(message))
    if (!looksInternal) return message
    if (error.statusCode === 404) {
      return isEnglish
        ? "We couldn’t find that. Reopen the screen and try again."
        : "요청한 내용을 찾을 수 없어요. 화면을 다시 열어 확인해 주세요."
    }
    if (error.statusCode === 400 || error.statusCode === 422) {
      return isEnglish
        ? "Check what you entered and try again."
        : "입력한 내용을 확인한 뒤 다시 시도해 주세요."
    }
  }
  return (
    fallback ??
    (isEnglish
      ? "We couldn’t finish that. Try again in a moment."
      : "지금은 이 작업을 마칠 수 없어요. 잠시 후 다시 시도해 주세요.")
  )
}
