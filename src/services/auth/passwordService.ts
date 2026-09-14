import { api, publicApi } from "../core/apiClient"
import type { ApiResponse } from "../../types"

/**
 * 로그인 상태에서 비밀번호를 바꾸면 서버가 **그 세션의 토큰을 새로 발급**해 준다 —
 * 바꾸는 순간 기존 리프레시 토큰이 전부 지워지므로(침입자 세션 차단) 이걸 받아 넣지
 * 않으면 액세스 토큰이 만료되는 한 시간 뒤에 조용히 로그아웃된다.
 * 재설정(딥링크) 경로는 세션이 없으니 null 이다.
 */
export interface PasswordChangeSession {
  readonly accessToken: string
  readonly refreshToken: string
}

interface PasswordService {
  // token 있으면 deeplink 경로 (비인증), 없으면 로그인 상태 (JWT 인증)
  changePassword(
    newPassword: string,
    token?: string,
    currentPassword?: string,
  ): Promise<PasswordChangeSession | null>
}

function readSession(result: unknown): PasswordChangeSession | null {
  if (!result || typeof result !== "object") return null
  const candidate = result as Partial<PasswordChangeSession>
  return typeof candidate.accessToken === "string" &&
    candidate.accessToken !== "" &&
    typeof candidate.refreshToken === "string" &&
    candidate.refreshToken !== ""
    ? {
        accessToken: candidate.accessToken,
        refreshToken: candidate.refreshToken,
      }
    : null
}

export const passwordService: PasswordService = {
  async changePassword(
    newPassword: string,
    token?: string,
    currentPassword?: string,
  ): Promise<PasswordChangeSession | null> {
    if (token) {
      await publicApi.patch<ApiResponse>("/auth/password/reset", {
        resetToken: token,
        password: newPassword,
      })
      return null
    }
    const { data } = await api.patch<ApiResponse<unknown>>("/user/password", {
      currentPassword,
      newPassword,
    })
    return readSession(data?.result)
  },
}
