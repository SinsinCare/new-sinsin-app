import { useState } from "react"
import { router } from "expo-router"
import { useAuth } from "@/src/hooks"
import type { LoginForm } from "../types"

export function useEmailLogin() {
  const { signInWithEmail, isLoading } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)

  const submitLogin = async (data: LoginForm) => {
    setLoginError(null)
    try {
      const result = await signInWithEmail(data.email, data.password)
      if (result.accountState === "PENDING_ONBOARDING") {
        router.replace("/onboarding")
      } else {
        router.replace("/(tabs)/home")
      }
    } catch (e: unknown) {
      setLoginError(
        e instanceof Error
          ? e.message
          : "이메일 또는 비밀번호를 다시 확인해주세요.",
      )
    }
  }

  const clearLoginError = () => setLoginError(null)

  return { isLoading, loginError, clearLoginError, submitLogin }
}
