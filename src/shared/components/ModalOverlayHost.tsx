import Toast from "react-native-toast-message"
import { V2DialogHost } from "@/src/design-system-v2"

/**
 * RN Modal 안에 얹는 알림 한 쌍 — 확인창(V2DialogHost)과 토스트.
 *
 * 둘 다 루트에 하나씩 이미 떠 있지만, iOS 의 RN Modal 은 네이티브 뷰컨트롤러라
 * 루트 뷰트리 위를 통째로 덮는다. 그 상태에서 루트 토스트는 모달 뒤에 그려져
 * 안 보이고, 루트 다이얼로그는 present 자체가 거부된다(루트 VC 가 이미
 * present 중이라). 그래서 모달 안에서 뜨는 알림은 모달 안에 호스트가 있어야 한다.
 *
 * 두 라이브러리 모두 "마지막에 마운트된 호스트가 이긴다" 규칙이라
 * 모달이 닫히면 알아서 루트 호스트로 되돌아간다.
 *
 * ```tsx
 * <Modal visible={open}>
 *   <EditorBody />
 *   <ModalOverlayHost />
 * </Modal>
 * ```
 */
export function ModalOverlayHost() {
  return (
    <>
      <V2DialogHost />
      <Toast />
    </>
  )
}
