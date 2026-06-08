import { useAuthStore, useUserStore } from "@/src/stores"
import { queryClient } from "./queryClient"
import { tokenService } from "./tokenService"

export async function clearClientSession(): Promise<void> {
  await tokenService.clearTokens()
  useUserStore.getState().reset()
  useAuthStore.getState().reset()
  queryClient.clear()
}
