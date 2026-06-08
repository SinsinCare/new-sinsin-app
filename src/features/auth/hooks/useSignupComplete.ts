import { router } from "expo-router"
import { useSignupStore, useAuthStore } from "@/src/stores"

export function useSignupComplete() {
  const nickname = useSignupStore((s) => s.nickname) || ""
  const resetSignup = useSignupStore((s) => s.reset)
  const setSignupInProgress = useSignupStore((s) => s.setSignupInProgress)
  const accountState = useAuthStore((s) => s.accountState)

  const handleStart = () => {
    if (accountState === "PENDING_ONBOARDING") {
      setSignupInProgress(false)
      router.replace("/onboarding")
    } else {
      resetSignup()
      router.replace("/(tabs)/home")
    }
  }

  return { nickname, handleStart }
}
