import { api } from "../core/apiClient"
import { tokenService } from "../core/tokenService"

export const userService = {
  async deleteAccount(
    reason = "앱에서 직접 탈퇴",
    detail: string | null = null,
  ): Promise<void> {
    await api.post("/user/withdraw", { reason, detail })
    await tokenService.clearTokens()
  },
}
