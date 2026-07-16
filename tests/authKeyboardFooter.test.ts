import {
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
  getAuthKeyboardFooterPadding,
} from "../src/features/auth/components/authKeyboardFooterLayout"

describe("auth keyboard footer layout", () => {
  it("uses the safe-area inset only while the keyboard is closed", () => {
    expect(getAuthKeyboardFooterPadding(34)).toEqual({
      closed: 58,
      opened: 12,
    })
  })

  it("reserves enough keyboard clearance for the primary action and focused input", () => {
    expect(AUTH_KEYBOARD_FOOTER_CLEARANCE).toBe(76)
  })
})
