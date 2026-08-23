import { getBackendUrl } from "../../config/appConfig"
import { getAppLanguage } from "@/src/i18n"
import { ApiError } from "./apiError"
import { clearClientSessionOn401 } from "./sessionCleanup"
import { tokenService } from "./tokenService"
import { FetchTimeoutError, fetchWithTimeout } from "./fetchWithTimeout"

const TOKEN_REFRESH_TIMEOUT_MS = 10000
type TokenRefreshResponse = {
  isSuccess?: boolean
  message?: string
  result?: {
    accessToken?: string
    refreshToken?: string
    sessionPersistence?: "persistent" | "ephemeral"
  }
}

let refreshPromise: Promise<string> | null = null

function createRefreshUnavailableError(error?: unknown): ApiError {
  const timedOut = error instanceof FetchTimeoutError
  const isEnglish = getAppLanguage() === "en"
  return new ApiError(
    timedOut
      ? isEnglish
        ? "The response is taking longer than expected. Try again in a moment."
        : "응답이 늦어지고 있어요. 잠시 후 다시 해 주세요."
      : isEnglish
        ? "Check your internet connection and try again."
        : "인터넷 연결을 확인한 뒤 다시 해 주세요.",
    timedOut ? "ECONNABORTED" : "NETWORK_ERROR",
    undefined,
    true,
  )
}

function createRefreshServerError(status: number): ApiError {
  const isEnglish = getAppLanguage() === "en"
  return new ApiError(
    status === 429
      ? isEnglish
        ? "We’re getting a lot of requests right now. Try again in a moment."
        : "이용이 잠시 몰리고 있어요. 잠시 뒤 다시 해 주세요."
      : isEnglish
        ? "Something went wrong on our side. Try again in a moment."
        : "서비스에 문제가 생겼어요. 잠시 후 다시 해 주세요.",
    `HTTP_${status}`,
    status,
  )
}

function refreshWasRejected(
  response: Response,
  _data: TokenRefreshResponse & { code?: unknown },
): boolean {
  // refresh 전용 엔드포인트의 400은 body 검증 실패를 포함해 현재 refresh token으로
  // 회복할 수 없는 요청이다. 429/5xx/네트워크 오류만 일시 실패로 보존한다.
  return (
    response.status === 400 ||
    response.status === 401 ||
    response.status === 403
  )
}

async function expireClientSession(): Promise<never> {
  // 목 인증에서는 지우지 않는다 — clearClientSessionOn401 머리말.
  await clearClientSessionOn401()
  throw createSessionExpiredError()
}

export function createSessionExpiredError(): ApiError {
  return new ApiError(
    getAppLanguage() === "en"
      ? "Your session has expired. Sign in again to keep your account secure."
      : "로그인 시간이 지났어요. 안전한 이용을 위해 다시 로그인해 주세요.",
    "AUTH_SESSION_EXPIRED",
    401,
    false,
  )
}

async function requestNewAccessToken(): Promise<string> {
  const refreshToken = await tokenService.getRefreshToken()
  if (!refreshToken) return expireClientSession()

  let response: Response
  try {
    response = await fetchWithTimeout(
      `${getBackendUrl()}/auth/tokens/refresh`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Language": getAppLanguage() === "en" ? "en-US" : "ko-KR",
        },
        body: JSON.stringify({ refreshToken }),
      },
      TOKEN_REFRESH_TIMEOUT_MS,
    )
  } catch (error) {
    throw createRefreshUnavailableError(error)
  }

  let data: TokenRefreshResponse & { code?: unknown }
  try {
    data = (await response.json()) as TokenRefreshResponse & { code?: unknown }
  } catch {
    if (response.status === 401 || response.status === 403) {
      return expireClientSession()
    }
    throw createRefreshServerError(response.status || 500)
  }

  if (refreshWasRejected(response, data)) return expireClientSession()

  const accessToken = data.result?.accessToken
  const newRefreshToken = data.result?.refreshToken
  if (
    !response.ok ||
    data.isSuccess === false ||
    !accessToken ||
    !newRefreshToken
  ) {
    throw createRefreshServerError(response.status || 500)
  }

  try {
    await tokenService.setTokens(
      accessToken,
      newRefreshToken,
      data.result?.sessionPersistence === "ephemeral"
        ? "ephemeral"
        : "persistent",
    )
  } catch {
    // 회전된 refresh token을 안전하게 저장하지 못하면 이전 토큰은 이미 무효일 수 있다.
    return expireClientSession()
  }
  return accessToken
}

/**
 * 모든 인증 네트워크 경계가 공유하는 단일 토큰 갱신 큐입니다.
 * 동시에 여러 요청이 401을 받아도 갱신 요청과 세션 정리는 한 번만 수행합니다.
 */
export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise

  const pending = requestNewAccessToken().finally(() => {
    if (refreshPromise === pending) refreshPromise = null
  })
  refreshPromise = pending
  return pending
}
