import { api, publicApi } from "../core/apiClient"
import type { ApiResponse } from "../../types"

interface PasswordService {
  // token 있으면 deeplink 경로 (비인증), 없으면 로그인 상태 (JWT 인증)
  changePassword(
    newPassword: string,
    token?: string,
    currentPassword?: string,
  ): Promise<void>
}

function getRealPasswordService(): PasswordService {
  return {
    async changePassword(
      newPassword: string,
      token?: string,
      currentPassword?: string,
    ): Promise<void> {
      if (token) {
        await publicApi.patch<ApiResponse>("/auth/password/reset", {
          resetToken: token,
          password: newPassword,
        })
      } else {
        await api.patch<ApiResponse>("/user/password", {
          currentPassword,
          newPassword,
        })
      }
    },
  }
}

export const passwordService: PasswordService = {
  changePassword: (newPassword, token, currentPassword) =>
    getRealPasswordService().changePassword(
      newPassword,
      token,
      currentPassword,
    ),
}
