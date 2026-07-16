import { mapSignupEmailSendFailure } from "../src/features/auth/data/signupEmailSendFailure"

describe("signup email send failure mapping", () => {
  it("maps a social-only email returned by the OTP POST", () => {
    expect(
      mapSignupEmailSendFailure({
        code: "AUTH_ERROR_009",
        message: "소셜 계정 연결 필요",
        result: {
          email: "user@example.com",
          providers: ["google", "kakao"],
        },
      }),
    ).toEqual({
      status: "email_login_link_required",
      email: "user@example.com",
      providers: ["google", "kakao"],
    })
  })

  it("maps an existing email returned by the OTP POST", () => {
    expect(
      mapSignupEmailSendFailure({
        code: "SIGNUP_ERROR_001",
        message: "이미 가입된 이메일입니다.",
      }),
    ).toEqual({
      status: "duplicate",
      message: "이미 가입된 이메일입니다.",
    })
  })

  it("leaves unrelated failures to the existing generic error path", () => {
    expect(
      mapSignupEmailSendFailure({
        code: "COMMON_ERROR_500",
        message: "서버 오류",
      }),
    ).toBeNull()
  })
})
