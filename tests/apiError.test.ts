import { isApiErrorLike } from "@/src/services/core/apiError"

describe("isApiErrorLike", () => {
  it("recognizes prototype-stripped API errors by their stable payload shape", () => {
    const error = {
      name: "ApiError",
      message: "소셜 회원가입 약관 동의가 필요합니다.",
      code: "AUTH_ERROR_011",
      statusCode: 409,
      isNetworkError: false,
      result: {
        provider: "google",
        socialSignupToken: "token",
      },
    }

    expect(isApiErrorLike(error)).toBe(true)
  })
})
