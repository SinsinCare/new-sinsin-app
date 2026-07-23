import { getDestinationForAccountState } from "../src/features/auth/utils/accountStateRoute"

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
