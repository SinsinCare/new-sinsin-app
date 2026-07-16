export function getKeyboardVisibilityEvents(platform: string) {
  return platform === "ios"
    ? {
        show: "keyboardWillShow" as const,
        hide: "keyboardWillHide" as const,
      }
    : {
        show: "keyboardDidShow" as const,
        hide: "keyboardDidHide" as const,
      }
}
