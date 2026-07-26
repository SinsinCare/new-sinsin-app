import { getPostAuthenticationDestination } from "../src/features/auth/data/emailLoginFlow"

describe("email login flow", () => {
  it.each([
    ["ACTIVE", false, "HOME", "/(tabs)/home"],
    ["ACTIVE", true, undefined, "/(auth)/profile-setup"],
    ["PENDING_PROFILE", false, undefined, "/(auth)/profile-setup"],
    ["PENDING_ONBOARDING", false, undefined, "/onboarding"],
    ["ACTIVE", false, "PROFILE", "/(auth)/profile-setup"],
  ] as const)(
    "uses the backend entry gate for %s recovery results",
    (accountState, requiresAdditionalInfo, entryGate, destination) => {
      expect(
        getPostAuthenticationDestination({
          accountState,
          requiresAdditionalInfo,
          entryGate,
        }),
      ).toBe(destination)
    },
  )
})
