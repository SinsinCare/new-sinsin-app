import { clearClientSession } from "./sessionCleanup"
import { createSessionExpiredError, refreshAccessToken } from "./authSession"
import { tokenService } from "./tokenService"
import { getAppLanguage } from "@/src/i18n"
import { getBackendUrl } from "@/src/config/appConfig"
import { fetchWithTimeout } from "./fetchWithTimeout"

export type AuthenticatedRequestFactory =
  | (() => RequestInit)
  | (() => Promise<RequestInit>)

export interface AuthenticatedFetchOptions {
  timeoutMs?: number
}

const DEFAULT_AUTHENTICATED_FETCH_TIMEOUT_MS = 60_000

function trustedBackendUrl(input: string): string {
  const backend = new URL(getBackendUrl())
  const target = new URL(input, backend)
  const backendPath = backend.pathname.replace(/\/+$/u, "")
  const isInsideBackendPath =
    target.pathname === backendPath ||
    target.pathname.startsWith(`${backendPath}/`)

  if (
    target.protocol !== backend.protocol ||
    target.host !== backend.host ||
    target.username !== "" ||
    target.password !== "" ||
    !isInsideBackendPath
  ) {
    throw new Error("Authenticated requests must target the configured backend")
  }
  return target.toString()
}

/**
 * fetch가 필요한 네이티브 업로드/스트리밍 경계용 인증 래퍼입니다.
 * 401이면 공용 갱신 큐를 거쳐 한 번만 재시도하며, factory를 다시 호출해
 * 소비되었을 수 있는 FormData/body를 새로 만듭니다.
 */
export async function authenticatedFetch(
  input: string,
  createRequest: AuthenticatedRequestFactory,
  options: AuthenticatedFetchOptions = {},
): Promise<Response> {
  const target = trustedBackendUrl(input)
  const send = async (accessToken: string | null) => {
    const init = await createRequest()
    const headers = new Headers(init.headers)
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`)
    } else {
      headers.delete("Authorization")
    }
    headers.set(
      "Accept-Language",
      getAppLanguage() === "en" ? "en-US" : "ko-KR",
    )
    return fetchWithTimeout(
      target,
      { ...init, headers },
      options.timeoutMs ?? DEFAULT_AUTHENTICATED_FETCH_TIMEOUT_MS,
    )
  }

  const accessToken = await tokenService.getAccessToken()
  const response = await send(accessToken)
  if (response.status !== 401) return response

  // 이 요청이 날아간 뒤 다른 요청이 이미 토큰을 갱신했을 수 있다. 늦게 도착한
  // 구 access-token 401 때문에 refresh token을 다시 회전시키지 않고 최신 토큰으로
  // 본문을 한 번 재구성한다.
  const currentAccessToken = await tokenService.getAccessToken()
  if (currentAccessToken && currentAccessToken !== accessToken) {
    const currentTokenResponse = await send(currentAccessToken)
    if (currentTokenResponse.status !== 401) return currentTokenResponse

    await clearClientSession({ requireFreshSocialProviderSelection: true })
    throw createSessionExpiredError()
  }

  const newAccessToken = await refreshAccessToken()
  const retryResponse = await send(newAccessToken)
  if (retryResponse.status !== 401) return retryResponse

  await clearClientSession({ requireFreshSocialProviderSelection: true })
  throw createSessionExpiredError()
}
