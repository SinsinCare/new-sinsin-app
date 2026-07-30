import { getErrorMessage } from "@/src/lib/errorUtils"
import { ApiError, isApiErrorLike } from "@/src/services/core/apiError"
import i18n from "@/src/i18n"

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

describe("getErrorMessage", () => {
  afterEach(async () => {
    await i18n.changeLanguage("ko")
  })

  it("turns implementation details into a user action", () => {
    const error = new ApiError("HTTP 422 API validation error", "HTTP_422", 422)

    expect(getErrorMessage(error)).toBe(
      "입력한 내용을 확인한 뒤 다시 시도해 주세요.",
    )
  })

  it("uses a specific screen fallback before a backend message", () => {
    const error = new ApiError("저장 처리에 실패했습니다.", "SAVE_FAILED", 400)

    expect(
      getErrorMessage(error, "입력한 내용을 확인한 뒤 다시 저장해 주세요."),
    ).toBe("입력한 내용을 확인한 뒤 다시 저장해 주세요.")
  })

  it("keeps a safe, actionable Korean message", () => {
    const error = new ApiError(
      "이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.",
      "NICKNAME_DUPLICATE",
      409,
    )

    expect(getErrorMessage(error)).toBe(
      "이미 사용 중인 닉네임이에요. 다른 닉네임을 입력해 주세요.",
    )
  })

  it("does not expose an arbitrary plain Error", () => {
    expect(getErrorMessage(new Error("Unexpected token at /api/user"))).toBe(
      "지금은 이 작업을 마칠 수 없어요. 잠시 후 다시 시도해 주세요.",
    )
  })

  it("returns English recovery copy when English is selected", async () => {
    await i18n.changeLanguage("en")

    expect(
      getErrorMessage(
        new ApiError("Network Error", "NETWORK_ERROR", undefined, true),
      ),
    ).toBe("Check your internet connection and try again.")
    expect(getErrorMessage(new Error("Unexpected token at /api/user"))).toBe(
      "We couldn’t finish that. Try again in a moment.",
    )
  })

  it("does not expose a Korean backend message in English mode", async () => {
    await i18n.changeLanguage("en")

    expect(
      getErrorMessage(
        new ApiError("입력한 값을 확인해 주세요.", "VALIDATION_FAILED", 422),
      ),
    ).toBe("Check what you entered and try again.")
  })
})
