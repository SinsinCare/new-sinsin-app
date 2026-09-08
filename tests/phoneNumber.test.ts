import {
  buildPhoneProfileUpdatePayload,
  buildRequiredPhoneNumberPayload,
  formatKoreanMobileInput,
  getOptionalPhoneNumberError,
  isValidKoreanMobile,
  getPhoneNumberErrorMessage,
} from "../src/features/auth/data/phoneNumber"

describe("Korean mobile phone input", () => {
  it("formats domestic mobile digits while the user types", () => {
    expect(formatKoreanMobileInput("01012345678")).toBe("010-1234-5678")
    expect(formatKoreanMobileInput("010-1234-567890")).toBe("010-1234-5678")
  })

  it("accepts only a complete 010 mobile number", () => {
    expect(isValidKoreanMobile("010-1234-5678")).toBe(true)
    expect(isValidKoreanMobile("011-1234-5678")).toBe(false)
    expect(isValidKoreanMobile("010-123-4567")).toBe(false)
  })

  it("keeps the optional empty value valid for existing-account profile flows", () => {
    expect(getOptionalPhoneNumberError("")).toBeNull()
  })

  it("requires a valid phone number for a new signup", () => {
    expect(() => buildRequiredPhoneNumberPayload("")).toThrow(
      getPhoneNumberErrorMessage(),
    )
    expect(buildRequiredPhoneNumberPayload("010-1234-5678")).toEqual({
      phoneNumber: "01012345678",
    })
  })

  it("returns a clear validation error for an incomplete value", () => {
    expect(getOptionalPhoneNumberError("010-1234")).toBe(
      getPhoneNumberErrorMessage(),
    )
    expect(() => buildRequiredPhoneNumberPayload("010-1234")).toThrow(
      getPhoneNumberErrorMessage(),
    )
  })

  it("uses explicit null only for a profile phone deletion", () => {
    expect(buildPhoneProfileUpdatePayload(null)).toEqual({ phoneNumber: null })
    expect(buildPhoneProfileUpdatePayload("010-1234-5678")).toEqual({
      phoneNumber: "01012345678",
    })
  })
})
