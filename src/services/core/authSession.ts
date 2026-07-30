import { getBackendUrl } from "../../config/appConfig"
import { getAppLanguage } from "@/src/i18n"
import { ApiError } from "./apiError"
import { clearClientSession } from "./sessionCleanup"
import { tokenService } from "./tokenService"

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
  try {
    const refreshToken = await tokenService.getRefreshToken()
    if (!refreshToken) {
      throw new Error("No refresh token")
    }

    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      TOKEN_REFRESH_TIMEOUT_MS,
    )

    let response: Response
    try {
      response = await fetch(`${getBackendUrl()}/auth/tokens/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "Accept-Language": getAppLanguage() === "en" ? "en-US" : "ko-KR",
        },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal as unknown as RequestInit["signal"],
      })
    } finally {
      clearTimeout(timeout)
    }

    const data = (await response.json()) as TokenRefreshResponse
    const accessToken = data.result?.accessToken
    const newRefreshToken = data.result?.refreshToken
    if (
      !response.ok ||
      data.isSuccess === false ||
      !accessToken ||
      !newRefreshToken
    ) {
      throw new Error(data.message || `HTTP ${response.status}`)
    }

    await tokenService.setTokens(
      accessToken,
      newRefreshToken,
      data.result?.sessionPersistence === "ephemeral"
        ? "ephemeral"
        : "persistent",
    )
    return accessToken
  } catch {
    await clearClientSession({ requireFreshSocialProviderSelection: true })
    throw createSessionExpiredError()
  }
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
