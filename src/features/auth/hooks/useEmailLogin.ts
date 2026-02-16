import { router } from "expo-router"
import { useAuth } from "@/src/hooks"
import { showErrorToast } from "@/src/lib/toast"
import type { LoginForm } from "../types"

export function useEmailLogin() {
  const { signInWithEmail, isLoading } = useAuth()

  const submitLogin = async (data: LoginForm) => {
    try {
      const result = await signInWithEmail(data.email, data.password)
      if (result.accountState === "PENDING_ONBOARDING") {
        router.replace("/onboarding")
      } else {
        router.replace("/(tabs)/home")
      }
    } catch (e: unknown) {
      showErrorToast(e instanceof Error ? e.message : "로그인에 실패했습니다.")
    }
  }

  return { isLoading, submitLogin }
}
