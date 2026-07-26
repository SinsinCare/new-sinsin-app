import { getAuthTextInputPresentation } from "../src/features/auth/data/authPresentation"

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
})
