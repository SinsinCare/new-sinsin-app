import Toast from "react-native-toast-message"

export function showErrorToast(message: string) {
  Toast.show({ type: "error", text1: message })
}

export function showSuccessToast(message: string) {
  Toast.show({ type: "success", text1: message })
}

export function showCopyToast() {
  Toast.show({
    type: "info",
    text1: "답변을 복사했습니다.",
    position: "bottom",
    bottomOffset: 100,
  })
}
