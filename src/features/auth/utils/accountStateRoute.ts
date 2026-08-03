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

/**
 * Returns the canonical destination when a signed-in user opens /onboarding
 * directly. Only users whose account is gated for onboarding may remain there.
 */
export function getOnboardingRouteRedirectDestination(
  accountState: AccountState | string | null | undefined,
  requiresAdditionalInfo = false,
  entryGate?: EntryGate,
  isOnboardingInProgress = false,
): AuthDestination | null {
  // Do not interrupt a questionnaire that was already mounted legitimately.
  // This also preserves its current completion screen until the product
  // decision about the final destination is resolved.
  if (isOnboardingInProgress) return null

  const destination = getDestinationForAccountState(
    accountState,
    requiresAdditionalInfo,
    entryGate,
  )

  return destination === "/onboarding" ? null : destination
}
