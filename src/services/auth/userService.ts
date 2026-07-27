import { api } from "../core/apiClient"
import type { WithdrawalReasonCode } from "@/src/features/settings/data/constants"

export const userService = {
  async deleteAccount(
    reasonCode: WithdrawalReasonCode,
    otherDetail: string | null,
    deleteMyPosts = false,
  ): Promise<void> {
    await api.post("/user/withdraw", {
      reasonCode,
      otherDetail,
      deleteMyPosts,
    })
  },
}
