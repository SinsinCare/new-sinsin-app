import { api, publicApi } from "../core/apiClient"
import type { ApiResponse } from "../../types"

interface PasswordService {
  // token 있으면 deeplink 경로 (비인증), 없으면 로그인 상태 (JWT 인증)
  changePassword(newPassword: string, token?: string): Promise<void>
}

function getRealPasswordService(): PasswordService {
  return {
    async changePassword(newPassword: string, token?: string): Promise<void> {
      if (token) {
        await publicApi.post<ApiResponse>("/auth/password/reset", {
          token,
          newPassword,
        })
      } else {
        await api.put<ApiResponse>("/auth/password", { newPassword })
      }
    },
  }
}

export const passwordService: PasswordService = {
  changePassword: (newPassword, token) =>
    getRealPasswordService().changePassword(newPassword, token),
}
