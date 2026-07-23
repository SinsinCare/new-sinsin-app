import { isProfileSetupCompletionMode } from "../src/features/auth/utils/profileSetupMode"

describe("profile setup completion mode", () => {
  it("locks the first required-profile screen from the server entry gate", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "PENDING_ONBOARDING",
        entryGate: "PROFILE",
        sessionPersistence: "ephemeral",
        requiresAdditionalInfo: false,
      }),
    ).toBe(true)
  })

  it("keeps an active account's additional-info backfill in completion mode", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: "ACTIVE",
        entryGate: "PROFILE",
        sessionPersistence: "persistent",
        requiresAdditionalInfo: true,
      }),
    ).toBe(true)
  })

  it("does not lock the ordinary email-signup form before a session exists", () => {
    expect(
      isProfileSetupCompletionMode({
        accountState: null,
        entryGate: "HOME",
        sessionPersistence: "persistent",
        requiresAdditionalInfo: false,
      }),
    ).toBe(false)
  })
})
