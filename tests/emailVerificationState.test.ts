import {
  canVerifyEmailOtp,
  getEmailOtpVerificationStatus,
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

  it("blocks verification when no active OTP remains", () => {
    expect(
      canVerifyEmailOtp({ codeSent: false, timer: 180, verified: false }),
    ).toBe(false)
    expect(
      canVerifyEmailOtp({ codeSent: true, timer: 0, verified: false }),
    ).toBe(false)
    expect(
      canVerifyEmailOtp({ codeSent: true, timer: 180, verified: true }),
    ).toBe(false)
  })

  it("keeps a live OTP retryable after an error and reports its status", () => {
    expect(
      canVerifyEmailOtp({
        codeSent: true,
        timer: 180,
        error: "인증번호가 올바르지 않습니다.",
        verified: false,
      }),
    ).toBe(true)
    expect(
      getEmailOtpVerificationStatus({
        codeSent: true,
        timer: 0,
        error: "인증번호가 올바르지 않습니다.",
        verified: false,
      }),
    ).toBe("expired")
    expect(
      getEmailOtpVerificationStatus({
        codeSent: true,
        timer: 180,
        verified: true,
      }),
    ).toBe("verified")
  })
})
