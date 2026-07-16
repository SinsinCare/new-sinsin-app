import { Redirect } from "expo-router"
import { useAuthStore } from "@/src/stores"

export function SignupCompleteScreen() {
  const accountState = useAuthStore((state) => state.accountState)

  return (
    <Redirect
      href={
        accountState === "PENDING_ONBOARDING" ? "/onboarding" : "/(tabs)/home"
      }
    />
  )
}
