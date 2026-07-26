import { api, publicApi } from "../core/apiClient"
import type { ApiResponse } from "../../types"
import { isMockUser } from "../../config/appConfig"

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

function getMockPasswordService(): PasswordService {
  return {
    async changePassword(
      _newPassword: string,
      _token?: string,
      _currentPassword?: string,
    ): Promise<void> {
      // Mock auth completes password changes locally without an API request.
    },
  }
}

function getPasswordService(): PasswordService {
  return isMockUser() ? getMockPasswordService() : getRealPasswordService()
}

export const passwordService: PasswordService = {
  changePassword: (newPassword, token, currentPassword) =>
    getPasswordService().changePassword(newPassword, token, currentPassword),
}
