import { Redirect } from "expo-router"
import { useAuthStore } from "@/src/stores"

export function SignupCompleteScreen() {
  const entryGate = useAuthStore((state) => state.entryGate)

  return (
    <Redirect
      href={
        entryGate === "ONBOARDING" ? "/onboarding" : "/(tabs)/home"
      }
    />
  )
}
