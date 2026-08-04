import { useAuthStore, useUserStore } from "@/src/stores"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { queryClient } from "./queryClient"
import { tokenService } from "./tokenService"

const SOCIAL_REAUTHENTICATION_INTENT_KEY =
  "@sinsin/next-social-login-reauthentication"
const SOCIAL_REAUTHENTICATION_INTENT_VALUE = "required"

export type ClearClientSessionOptions = {
  requireFreshSocialProviderSelection?: boolean
}

export function clearClientSessionState(): void {
  useUserStore.getState().reset()
  useAuthStore.getState().reset()
  queryClient.clear()
}

export async function clearClientSession(
  options: ClearClientSessionOptions = {},
): Promise<void> {
  if (options.requireFreshSocialProviderSelection) {
    try {
      await AsyncStorage.setItem(
        SOCIAL_REAUTHENTICATION_INTENT_KEY,
        SOCIAL_REAUTHENTICATION_INTENT_VALUE,
      )
    } catch {
      // A storage failure must not leave an invalid client session active.
    }
  }
  try {
    await tokenService.clearTokens()
  } finally {
    // SecureStore 삭제 자체가 실패해도 메모리 사용자 상태와 민감 쿼리 캐시는 남기지 않는다.
    clearClientSessionState()
  }
}
