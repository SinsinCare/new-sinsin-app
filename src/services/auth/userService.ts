import { api } from "../core/apiClient"

export const userService = {
  async deleteAccount(
    reason = "앱에서 직접 탈퇴",
    detail: string | null = null,
    deleteMyPosts = false,
  ): Promise<void> {
    await api.post("/user/withdraw", { reason, detail, deleteMyPosts })
  },
}
