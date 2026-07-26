import {
  getAuthKeyboardDismissMode,
  getAuthKeyboardScrollViewportInset,
  getAuthPasswordPlaceholders,
  getAuthScrollableContentPresentation,
  getAuthTextInputPresentation,
} from "../src/features/auth/data/authPresentation"

describe("auth text input presentation", () => {
  it("uses non-capitalizing email input defaults", () => {
    expect(getAuthTextInputPresentation("email")).toEqual({
      keyboardType: "email-address",
      autoCapitalize: "none",
      secureTextEntry: false,
    })
  })

  it("keeps passwords concealed until the auth adapter reveals them", () => {
    expect(getAuthTextInputPresentation("password")).toEqual({
      keyboardType: "default",
      autoCapitalize: "none",
      secureTextEntry: true,
    })
  })

  it.each([
    ["text", "default"],
    ["number", "numeric"],
    ["phone", "phone-pad"],
  ] as const)(
    "maps %s input to the expected keyboard",
    (inputType, keyboardType) => {
      expect(getAuthTextInputPresentation(inputType).keyboardType).toBe(
        keyboardType,
      )
    },
  )

  it("lets scrollable content grow without shrinking its natural height", () => {
    expect(getAuthScrollableContentPresentation()).toEqual({ flexGrow: 1 })
    expect(getAuthScrollableContentPresentation()).not.toHaveProperty("flex")
  })

  it("uses platform-native keyboard dismissal for scroll gestures", () => {
    expect(getAuthKeyboardDismissMode("ios")).toBe("interactive")
    expect(getAuthKeyboardDismissMode("android")).toBe("on-drag")
  })

  it("reserves Android viewport space for footer content above the baseline", () => {
    expect(getAuthKeyboardScrollViewportInset("android", 150, 80)).toBe(70)
    expect(getAuthKeyboardScrollViewportInset("android", 80, 80)).toBe(0)
    expect(getAuthKeyboardScrollViewportInset("ios", 150, 80)).toBe(0)
  })

  it("uses concise password placeholders only for large text", () => {
    expect(getAuthPasswordPlaceholders(1.29)).toEqual({
      password: "비밀번호를 형식에 맞춰 입력해주세요",
      confirmPassword: "입력한 비밀번호를 다시 입력해주세요",
    })
    expect(getAuthPasswordPlaceholders(1.3)).toEqual({
      password: "비밀번호 입력",
      confirmPassword: "비밀번호 다시 입력",
    })
  })
})
