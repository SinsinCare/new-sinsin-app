import { V2Modal } from "@/src/design-system-v2"

/**
 * "쓰던 걸 두고 나갈까요" 확인 — 이제 V2Modal 한 겹 껍데기다.
 *
 * 예전엔 Tamagui + 자체 페이드 애니메이션(absoluteFill 오버레이)으로 따로
 * 구현돼 있었다. 확인창이 화면마다 다른 얼굴로 뜨던 시절의 유물이라
 * ConfirmModal 과 함께 흡수했다 — V2Modal 도 Modal 의 fade 로 같은 등장을 준다.
 *
 * **주의.** 옛 구현은 RN Modal 이 아니라 뷰트리 안의 오버레이였고, 지금은
 * 진짜 RN Modal 이다. 그래서 이미 열려 있는 RN Modal **안에서는 못 쓴다**
 * (iOS 가 present 를 거부한다 — V2DialogHost 머리말 참고). 현재 호출부는
 * 전부 라우트 화면이라 해당 없음.
 *
 * props 는 그대로 두어 기존 호출부를 건드리지 않는다. **새 코드는 이것 대신
 * `showConfirm`(src/lib/dialog.ts)을 쓸 것.**
 */
interface ConfirmExitModalProps {
  visible: boolean
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmExitModal({
  visible,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmExitModalProps) {
  return (
    <V2Modal
      visible={visible}
      title={title}
      description={description}
      primaryLabel={confirmLabel}
      onPrimary={onConfirm}
      secondaryLabel={cancelLabel}
      onSecondary={onCancel}
      onRequestClose={onCancel}
    />
  )
}
