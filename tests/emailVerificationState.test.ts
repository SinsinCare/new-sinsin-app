import {
  isVerifiedEmailMatch,
  normalizeSignupEmail,
} from "../src/features/auth/data/emailVerificationState"

describe("signup email verification state", () => {
  it("normalizes email input before comparing verification state", () => {
    expect(normalizeSignupEmail(" Alloy0301@Gmail.COM ")).toBe(
      "alloy0301@gmail.com",
    )
  })

  it("matches only when the current input is the verified email", () => {
    expect(
      isVerifiedEmailMatch("alloy0301@gmail.com", " alloy0301@gmail.com "),
    ).toBe(true)
    expect(isVerifiedEmailMatch("alloy0301@gmail.com", "other@gmail.com")).toBe(
      false,
    )
    expect(isVerifiedEmailMatch(null, "alloy0301@gmail.com")).toBe(false)
  })
})
