import { router } from "expo-router"
import { useSignupStore, useAuthStore } from "@/src/stores"

export function useSignupComplete() {
  const nickname = useSignupStore((s) => s.nickname) || ""
  const resetSignup = useSignupStore((s) => s.reset)
  const accountState = useAuthStore((s) => s.accountState)

  const handleStart = () => {
    resetSignup()
    if (accountState === "PENDING_ONBOARDING") {
      router.replace("/onboarding")
    } else {
      router.replace("/(tabs)/home")
    }
  }

  return { nickname, handleStart }
}
