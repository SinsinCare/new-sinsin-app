import { getKeyboardVisibilityEvents } from "../src/hooks/keyboardVisibility"

describe("keyboard visibility event contract", () => {
  it("uses animation-start events on iOS so footer padding changes with the keyboard", () => {
    expect(getKeyboardVisibilityEvents("ios")).toEqual({
      show: "keyboardWillShow",
      hide: "keyboardWillHide",
    })
  })

  it("uses supported completion events on Android", () => {
    expect(getKeyboardVisibilityEvents("android")).toEqual({
      show: "keyboardDidShow",
      hide: "keyboardDidHide",
    })
  })
})
