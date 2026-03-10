import { router } from "expo-router"
import { useSignupStore } from "@/src/stores"
import type { PasswordForm } from "../types"

export function useSignupPassword() {
  const setPassword = useSignupStore((s) => s.setPassword)
  const setSignupInProgress = useSignupStore((s) => s.setSignupInProgress)

  const handleNext = (data: PasswordForm) => {
    setPassword(data.password)
    setSignupInProgress(true)
    router.replace("/(auth)/profile-setup")
  }

  return { handleNext }
}
