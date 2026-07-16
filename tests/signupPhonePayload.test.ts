import {
  buildOptionalPhoneNumberPayload,
  buildRequiredPhoneNumberPayload,
  PHONE_NUMBER_ERROR_MESSAGE,
} from "../src/features/auth/data/phoneNumber"
import { useSignupStore } from "../src/stores/signupStore"

describe("signup phone payload", () => {
  beforeEach(() => {
    useSignupStore.getState().reset()
  })

  it("preserves an email signup phone value in temporary signup state", () => {
    useSignupStore.getState().setPhoneNumber("010-1234-5678")

    expect(
      buildRequiredPhoneNumberPayload(useSignupStore.getState().phoneNumber),
    ).toEqual({ phoneNumber: "01012345678" })
  })

  it("adds the normalized field to the social profile completion request", () => {
    const socialRequest = {
      name: "소셜 사용자",
      gender: "FEMALE",
      ...buildRequiredPhoneNumberPayload("010 9876 5432"),
    }

    expect(socialRequest.phoneNumber).toBe("01098765432")
  })

  it("rejects an omitted phoneNumber in new email and social profile flows", () => {
    expect(() => buildRequiredPhoneNumberPayload("")).toThrow(
      PHONE_NUMBER_ERROR_MESSAGE,
    )
  })

  it("keeps the optional builder compatible with older app requests", () => {
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
