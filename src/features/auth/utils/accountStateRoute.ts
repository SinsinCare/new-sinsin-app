import type { AccountState } from "@/src/types"

export type AuthDestination =
  | "/(auth)/profile-setup"
  | "/onboarding"
  | "/(tabs)/home"

export function getDestinationForAccountState(
  accountState: AccountState | string | null | undefined,
): AuthDestination {
  if (accountState === "PENDING_PROFILE") return "/(auth)/profile-setup"
  if (accountState === "PENDING_ONBOARDING") return "/onboarding"
  return "/(tabs)/home"
}
