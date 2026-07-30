import { clearClientSession } from "./sessionCleanup"
import { createSessionExpiredError, refreshAccessToken } from "./authSession"
import { tokenService } from "./tokenService"
import { getAppLanguage } from "@/src/i18n"

export type AuthenticatedRequestFactory =
  | (() => RequestInit)
  | (() => Promise<RequestInit>)

/**
 * fetch가 필요한 네이티브 업로드/스트리밍 경계용 인증 래퍼입니다.
 * 401이면 공용 갱신 큐를 거쳐 한 번만 재시도하며, factory를 다시 호출해
 * 소비되었을 수 있는 FormData/body를 새로 만듭니다.
 */
export async function authenticatedFetch(
  input: string,
  createRequest: AuthenticatedRequestFactory,
): Promise<Response> {
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
    return fetch(input, { ...init, headers })
  }

  const accessToken = await tokenService.getAccessToken()
  const response = await send(accessToken)
  if (response.status !== 401) return response

  const newAccessToken = await refreshAccessToken()
  const retryResponse = await send(newAccessToken)
  if (retryResponse.status !== 401) return retryResponse

  await clearClientSession({ requireFreshSocialProviderSelection: true })
  throw createSessionExpiredError()
}
