// 결과 통보 — 사용자가 고를 게 없으면 모달로 막아세우지 않는다.
// 선택이 필요한 순간에만 showConfirm(src/lib/dialog.ts) 을 쓸 것.
//
// 본문(body)은 "실패했다"가 아니라 "다음에 뭘 하면 되는지"를 적는다.
// Toast.tsx 가 제목/본문 두 줄을 이미 그린다.
//
// 오류를 알릴 때는 이 파일을 직접 부르는 것보다 `presentError`
// (src/lib/errorMessage) 가 낫다 — 문구·그릇·버튼을 서버 코드에 맞춰 골라 준다.
// 여기 남은 것은 문구를 이미 손에 쥔 호출부용이다.

import Toast from "react-native-toast-message"

/**
 * 토스트 안의 해결 버튼. **"~해 주세요" 를 적는 대신 그 자리에서 하게 한다**(토스 원칙 5).
 * 3.5초 뒤 토스트가 사라지므로, 되돌릴 수 없는 동작은 여기 두지 않는다.
 */
export type ToastAction = {
  label: string
  onPress: () => void
}

export type ToastProps = {
  action?: ToastAction
}

function show(
  type: "error" | "success" | "info",
  title: string,
  body?: string,
  action?: ToastAction,
) {
  Toast.show({
    type,
    text1: title,
    text2: body,
    props: { action } satisfies ToastProps,
    // 버튼이 있으면 읽고 누를 시간이 더 필요하다.
    visibilityTime: action ? 6000 : undefined,
  })
}

export function showErrorToast(
  title: string,
  body?: string,
  action?: ToastAction,
) {
  show("error", title, body, action)
}

export function showSuccessToast(
  title: string,
  body?: string,
  action?: ToastAction,
) {
  show("success", title, body, action)
}

export function showInfoToast(
  title: string,
  body?: string,
  action?: ToastAction,
) {
  show("info", title, body, action)
}
