import type { AccountState, EntryGate } from "@/src/types"

export type AuthDestination =
  | "/(auth)/profile-setup"
  | "/onboarding"
  | "/(tabs)/home"

export function getDestinationForAccountState(
  accountState: AccountState | string | null | undefined,
  requiresAdditionalInfo = false,
  entryGate?: EntryGate,
): AuthDestination {
  if (entryGate === "PROFILE") return "/(auth)/profile-setup"
  if (entryGate === "ONBOARDING") return "/onboarding"
  if (entryGate === "HOME") return "/(tabs)/home"
  if (accountState === "ACTIVE" && requiresAdditionalInfo) {
    return "/(auth)/profile-setup"
  }
  if (accountState === "PENDING_PROFILE") return "/(auth)/profile-setup"
  if (accountState === "PENDING_ONBOARDING") return "/onboarding"
  return "/(tabs)/home"
}
