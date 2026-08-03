import { publicApi } from "@/src/services/core/apiClient"
import { ApiError } from "@/src/services/core/apiError"
import { isMockUser } from "@/src/config/appConfig"

interface NicknameService {
  checkNicknameAvailability(nickname: string): Promise<boolean>
}

function getRealNicknameService(): NicknameService {
  return {
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
}

function getMockNicknameService(): NicknameService {
  return {
    async checkNicknameAvailability(_nickname: string): Promise<boolean> {
      return true
    },
  }
}

function getNicknameService(): NicknameService {
  return isMockUser() ? getMockNicknameService() : getRealNicknameService()
}

export const nicknameService: NicknameService = {
  checkNicknameAvailability: (nickname) =>
    getNicknameService().checkNicknameAvailability(nickname),
}
