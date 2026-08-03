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

  /*
    이미 가입된 이메일은 예전에 여기서 걸러 문구를 손으로 지었고, 그 문구가 제보의
    시작이었다 — "다른 이메일을 입력하거나 로그인해 주세요" 는 두 선택지를 말만 하고
    어느 쪽도 눌러 주지 않았다. 지금은 카탈로그가 다이얼로그 + "로그인하기" 버튼으로
    올린다(`lib/errorMessage/catalog.ts` 의 `DIALOG_CODES`). 이 함수는 화면이 자기
    흐름으로 받아야 하는 `AUTH_ERROR_009` 하나만 남긴다.
  */
  it("leaves an existing email to the error catalog", () => {
    expect(
      mapSignupEmailSendFailure({
        code: "SIGNUP_ERROR_001",
        message: "이미 가입된 이메일입니다.",
      }),
    ).toBeNull()
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
