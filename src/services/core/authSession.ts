import { getBackendUrl } from "../../config/appConfig"
import { ApiError } from "./apiError"
import { clearClientSession } from "./sessionCleanup"
import { tokenService } from "./tokenService"

const TOKEN_REFRESH_TIMEOUT_MS = 10000
const SESSION_EXPIRED_MESSAGE = "로그인이 만료되었습니다. 다시 로그인해주세요."

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
    SESSION_EXPIRED_MESSAGE,
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
        },
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
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
    await clearClientSession()
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
