import {
  getDestinationForAccountState,
  getOnboardingRouteRedirectDestination,
} from "../src/features/auth/utils/accountStateRoute"

describe("auth entry gate routing", () => {
  it("uses the server entry gate ahead of legacy account state", () => {
    expect(
      getDestinationForAccountState("PENDING_ONBOARDING", false, "HOME"),
    ).toBe("/(tabs)/home")
  })

  it("keeps a new incomplete account in its required gate", () => {
    expect(
      getDestinationForAccountState("PENDING_PROFILE", false, "PROFILE"),
    ).toBe("/(auth)/profile-setup")
    expect(
      getDestinationForAccountState("PENDING_ONBOARDING", false, "ONBOARDING"),
    ).toBe("/onboarding")
  })
})

describe("direct onboarding route guard", () => {
  it("redirects HOME-gated users away from onboarding", () => {
    expect(
      getOnboardingRouteRedirectDestination(
        "PENDING_ONBOARDING",
        false,
        "HOME",
      ),
    ).toBe("/(tabs)/home")
  })

  it("redirects PROFILE-gated users away from onboarding", () => {
    expect(
      getOnboardingRouteRedirectDestination(
        "PENDING_ONBOARDING",
        false,
        "PROFILE",
      ),
    ).toBe("/(auth)/profile-setup")
  })

  it("allows only ONBOARDING-gated users to remain on onboarding", () => {
    expect(
      getOnboardingRouteRedirectDestination("ACTIVE", false, "ONBOARDING"),
    ).toBeNull()
  })

  it("does not interrupt an onboarding flow that is already in progress", () => {
    expect(
      getOnboardingRouteRedirectDestination("ACTIVE", false, "HOME", true),
    ).toBeNull()
  })
})
