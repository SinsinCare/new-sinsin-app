import { publicApi } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"

export const nicknameService = {
  async checkNicknameAvailability(nickname: string): Promise<boolean> {
    try {
      await publicApi.get(
        `/auth/signup/nickname/verify?nickName=${encodeURIComponent(nickname)}`,
      )
      return true
    } catch (e) {
      if (e instanceof ApiError && !e.isNetworkError) {
        return false
      }
      throw e
    }
  },
}
