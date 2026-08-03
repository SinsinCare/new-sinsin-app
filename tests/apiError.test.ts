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
      "입력한 내용을 다시 확인해 주세요 빠졌거나 형식이 맞지 않는 항목이 있어요.",
    )
  })

  /*
    예전에는 화면 폴백이 서버 문구를 이겼다. 그 규칙 때문에 `SIGNUP_ERROR_003`
    (닉네임 중복) 같은 **사용자가 직접 고쳐야 고쳐지는** 오류가 "저장하지 못했어요"
    한 문장으로 뭉개졌다(`useSignupSteps.ts` 가 이 규칙을 피하려고 폴백을 일부러
    빼 두고 20줄짜리 주석을 남겼을 정도다).

    지금은 반대다 — 코드가 있으면 코드가 이긴다. 폴백은 코드도 서버 문구도 없을
    때만 쓴다.
  */
  it("prefers a coded backend message over a generic screen fallback", () => {
    const error = new ApiError("저장 처리에 실패했습니다.", "SAVE_FAILED", 400)

    expect(
      getErrorMessage(error, "입력한 내용을 확인한 뒤 다시 저장해 주세요."),
    ).toBe("저장 처리에 실패했습니다.")
  })

  it("prefers the app catalog over the backend wording for known codes", () => {
    const error = new ApiError(
      "이미 사용 중인 닉네임입니다.",
      "SIGNUP_ERROR_003",
      400,
    )

    expect(getErrorMessage(error, "회원가입을 마치지 못했어요.")).toBe(
      "이미 쓰고 있는 닉네임이에요 뒤에 숫자를 붙이거나 다른 이름을 지어 주세요.",
    )
  })

  it("uses the screen fallback only when there is no code and no server wording", () => {
    const error = new ApiError("", "HTTP_400", 400)

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
      "지금은 이 작업을 마치지 못했어요 잠시 뒤 다시 시도해 주세요. 계속되면 문의를 보내 주시면 확인해 드릴게요.",
    )
  })

  it("returns English recovery copy when English is selected", async () => {
    await i18n.changeLanguage("en")

    expect(
      getErrorMessage(
        new ApiError("Network Error", "NETWORK_ERROR", undefined, true),
      ),
    ).toBe(
      "We couldn't reach the server Check that Wi-Fi or mobile data is on, then try again.",
    )
    expect(getErrorMessage(new Error("Unexpected token at /api/user"))).toBe(
      "We couldn't finish that Try again in a moment. If it keeps happening, contact us and we'll look into it.",
    )
  })

  it("does not expose a Korean backend message in English mode", async () => {
    await i18n.changeLanguage("en")

    expect(
      getErrorMessage(
        new ApiError("입력한 값을 확인해 주세요.", "VALIDATION_FAILED", 422),
      ),
    ).toBe(
      "Check what you entered Something is missing or in the wrong format.",
    )
  })
})
