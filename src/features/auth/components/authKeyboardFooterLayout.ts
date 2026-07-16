import { spacing } from "@/src/design-system-v2/tokens/spacing"

const AUTH_PRIMARY_ACTION_HEIGHT = 52
const AUTH_KEYBOARD_OPEN_GAP = spacing[12]
const AUTH_KEYBOARD_CLOSED_GAP = spacing[24]
const AUTH_FOCUSED_INPUT_GAP = spacing[12]

export const AUTH_KEYBOARD_FOOTER_CLEARANCE =
  AUTH_PRIMARY_ACTION_HEIGHT + AUTH_KEYBOARD_OPEN_GAP + AUTH_FOCUSED_INPUT_GAP

export function getAuthKeyboardFooterPadding(safeAreaBottom: number) {
  return {
    closed: safeAreaBottom + AUTH_KEYBOARD_CLOSED_GAP,
    opened: AUTH_KEYBOARD_OPEN_GAP,
  }
}

export function getAuthKeyboardFooterBottomPadding(
  safeAreaBottom: number,
  isKeyboardVisible: boolean,
) {
  const padding = getAuthKeyboardFooterPadding(safeAreaBottom)
  return isKeyboardVisible ? padding.opened : padding.closed
}
