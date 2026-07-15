import { buildOptionalPhoneNumberPayload } from "../src/features/auth/data/phoneNumber"
import { useSignupStore } from "../src/stores/signupStore"

describe("signup optional phone payload", () => {
  beforeEach(() => {
    useSignupStore.getState().reset()
  })

  it("preserves an email signup phone value in temporary signup state", () => {
    useSignupStore.getState().setPhoneNumber("010-1234-5678")

    expect(
      buildOptionalPhoneNumberPayload(useSignupStore.getState().phoneNumber),
    ).toEqual({ phoneNumber: "01012345678" })
  })

  it("adds the same normalized field to a social signup request", () => {
    const socialRequest = {
      socialSignupToken: "social-token",
      termsOfServiceAgree: true,
      privacyPolicyAgree: true,
      marketingAgree: false,
      ...buildOptionalPhoneNumberPayload("010 9876 5432"),
    }

    expect(socialRequest.phoneNumber).toBe("01098765432")
  })

  it("omits phoneNumber for legacy and skipped signup flows", () => {
    const emailRequest = {
      signupToken: "signup-token",
      ...buildOptionalPhoneNumberPayload(""),
    }
    const socialRequest = {
      socialSignupToken: "social-token",
      ...buildOptionalPhoneNumberPayload(""),
    }

    expect(emailRequest).not.toHaveProperty("phoneNumber")
    expect(socialRequest).not.toHaveProperty("phoneNumber")
  })

  it("clears a previously entered phone when the signup flow resets", () => {
    useSignupStore.getState().setPhoneNumber("010-1234-5678")
    useSignupStore.getState().reset()

    expect(useSignupStore.getState().phoneNumber).toBe("")
    expect(
      buildOptionalPhoneNumberPayload(useSignupStore.getState().phoneNumber),
    ).toEqual({})
  })
})
