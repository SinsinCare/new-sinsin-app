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
  await tokenService.clearTokens()
  useUserStore.getState().reset()
  useAuthStore.getState().reset()
  queryClient.clear()
}
