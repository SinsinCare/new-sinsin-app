import {
  AUTH_KEYBOARD_FOOTER_CLEARANCE,
  getAuthKeyboardFooterLayout,
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

  it("keeps one footer height and lets the sticky view own the keyboard transition", () => {
    expect(getAuthKeyboardFooterLayout(34)).toEqual({
      paddingBottom: 58,
      offset: {
        closed: 0,
        opened: 46,
      },
    })
  })

  it("keeps the open gap platform-safe when there is no bottom inset", () => {
    expect(getAuthKeyboardFooterLayout(0)).toEqual({
      paddingBottom: 24,
      offset: {
        closed: 0,
        opened: 12,
      },
    })
  })
})
